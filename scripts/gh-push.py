#!/usr/bin/env python3
"""Push the current branch to GitHub.

Strategy:
1. Try native git push (with token from .env, short timeout).
2. If github.com git protocol is blocked or times out, replay
   unpushed commits through api.github.com.

Usage:
    python3 scripts/gh-push.py
    python3 scripts/gh-push.py --api-only
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

API = "https://api.github.com"
EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
TOKEN_KEYS = ("GITHUB_PUSH_TOKEN", "GITHUB_TOKEN", "GH_TOKEN")


def repo_root() -> Path:
    out = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True)
    return Path(out.strip())


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


def token_from_env() -> str:
    for key in TOKEN_KEYS:
        value = (os.environ.get(key) or "").strip()
        if value:
            return value
    return ""


def git(*args: str, binary: bool = False, check: bool = True):
    result = subprocess.run(
        ["git", *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if check and result.returncode != 0:
        err = result.stderr.decode("utf-8", "replace").strip()
        raise RuntimeError(err or f"git {' '.join(args)} failed")
    if binary:
        return result
    result.stdout_text = result.stdout.decode("utf-8")
    result.stderr_text = result.stderr.decode("utf-8", "replace")
    return result


def current_branch() -> str:
    result = git("symbolic-ref", "--short", "HEAD")
    return result.stdout_text.strip()


def parse_owner_repo(remote: str = "origin") -> tuple[str, str]:
    url = git("remote", "get-url", remote).stdout_text.strip()
    match = re.search(r"github\.com[:/](?P<owner>[^/]+)/(?P<repo>[^/.]+)", url)
    if not match:
        raise SystemExit(f"無法從 remote {remote} 解析 GitHub 倉庫: {url}")
    return match.group("owner"), match.group("repo")


def parse_commit(raw: str) -> dict:
    lines = raw.splitlines()
    meta: dict = {"parents": []}
    i = 0
    while i < len(lines) and lines[i]:
        key, _, value = lines[i].partition(" ")
        if key in ("author", "committer"):
            name_email, _, tz = value.rpartition(" ")
            name_email, _, ts = name_email.rpartition(" ")
            name, _, email = name_email.partition(" <")
            hours = int(tz[0] + tz[1:3])
            minutes = int(tz[0] + tz[3:5]) if len(tz) >= 5 else 0
            dt = datetime.fromtimestamp(
                int(ts), timezone(timedelta(hours=hours, minutes=minutes))
            )
            iso = dt.strftime("%Y-%m-%dT%H:%M:%S%z")
            iso = iso[:-2] + ":" + iso[-2:]
            meta[key] = {"name": name, "email": email.rstrip(">"), "date": iso}
        elif key == "parent":
            meta["parents"].append(value)
        elif key == "tree":
            meta["tree"] = value
        i += 1
    message = "\n".join(lines[i + 1 :])
    if not message.endswith("\n"):
        message += "\n"
    meta["message"] = message
    return meta


def parse_diff_tree(raw: bytes) -> list[dict]:
    entries = []
    i = 0
    while i < len(raw):
        if raw[i] != ord(":"):
            break
        nul = raw.find(b"\x00", i)
        header = raw[i + 1 : nul].decode("utf-8")
        i = nul + 1
        nul = raw.find(b"\x00", i)
        path = raw[i:nul].decode("utf-8")
        i = nul + 1
        old_mode, new_mode, old_sha, new_sha, status = header.split()
        entries.append(
            {
                "old_mode": old_mode,
                "new_mode": new_mode,
                "old_sha": old_sha,
                "new_sha": new_sha,
                "status": status,
                "path": path,
            }
        )
    return entries


class GitHubAPI:
    def __init__(self, token: str, owner: str, repo: str):
        self.token = token
        self.owner = owner
        self.repo = repo

    def request(self, method: str, path: str, body=None, timeout: int = 180, retries: int = 3):
        data = None if body is None else json.dumps(body).encode("utf-8")
        url = API + path
        last_error = None
        for attempt in range(1, retries + 1):
            req = urllib.request.Request(
                url,
                data=data,
                method=method,
                headers={
                    "Accept": "application/vnd.github+json",
                    "Authorization": f"Bearer {self.token}",
                    "User-Agent": "ryy-gh-push",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )
            if data is not None:
                req.add_header("Content-Type", "application/json")
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    raw = resp.read()
                    return json.loads(raw.decode("utf-8")) if raw else {}
            except urllib.error.HTTPError as exc:
                err = exc.read().decode("utf-8", "replace")
                if exc.code in (429, 502, 503, 504) and attempt < retries:
                    wait = 2 ** attempt
                    print(f"  API {exc.code}，{wait}s 後重試 ({attempt}/{retries})")
                    time.sleep(wait)
                    last_error = SystemExit(f"API {method} {path} failed {exc.code}: {err[:800]}")
                    continue
                raise SystemExit(f"API {method} {path} failed {exc.code}: {err[:800]}")
            except urllib.error.URLError as exc:
                if attempt < retries:
                    wait = 2 ** attempt
                    print(f"  連線失敗，{wait}s 後重試 ({attempt}/{retries}): {exc.reason}")
                    time.sleep(wait)
                    last_error = exc
                    continue
                raise SystemExit(f"API 連線失敗: {exc.reason}")
        raise last_error or SystemExit("API request failed")

    def repo_path(self, suffix: str) -> str:
        return f"/repos/{self.owner}/{self.repo}{suffix}"


def try_native_git_push(token: str, remote: str, branch: str, timeout: int) -> bool:
    print(f"嘗試 git push {remote} {branch}（逾時 {timeout}s）...")
    askpass = repo_root() / ".git" / "gh-push-askpass.sh"
    askpass.write_text("#!/bin/sh\ncase \"$1\" in\n*[Uu]sername*) echo x ;;\n*) echo \"$GITHUB_PUSH_ASKPASS_PASSWORD\" ;;\nesac\n", encoding="utf-8")
    askpass.chmod(0o700)
    env = os.environ.copy()
    env["GIT_ASKPASS"] = str(askpass)
    env["GIT_TERMINAL_PROMPT"] = "0"
    if token:
        env["GITHUB_PUSH_ASKPASS_PASSWORD"] = token
    try:
        result = subprocess.run(
            [
                "timeout",
                str(timeout),
                "git",
                "-c",
                "http.version=HTTP/1.1",
                "-c",
                "http.postBuffer=524288000",
                "push",
                "-u",
                remote,
                f"HEAD:refs/heads/{branch}",
            ],
            cwd=str(repo_root()),
            env=env,
            text=True,
        )
        if result.returncode == 0:
            print("git push 成功")
            return True
        print(f"git push 失敗（exit {result.returncode}），改走 GitHub API")
        return False
    finally:
        if askpass.exists():
            askpass.unlink()


def push_commit_via_api(api: GitHubAPI, commit_sha: str) -> str:
    commit = parse_commit(git("cat-file", "-p", commit_sha).stdout_text)
    parents = commit.get("parents") or []
    parent = parents[0] if parents else EMPTY_TREE
    base_tree = (
        git("rev-parse", f"{parent}^{{tree}}").stdout_text.strip()
        if parents
        else EMPTY_TREE
    )
    local_tree = git("rev-parse", f"{commit_sha}^{{tree}}").stdout_text.strip()
    diff = git(
        "diff-tree",
        "-r",
        "--no-commit-id",
        "--no-renames",
        "-z",
        parent if parents else EMPTY_TREE,
        commit_sha,
        binary=True,
    )
    entries = parse_diff_tree(diff.stdout)
    print(f"推送 commit {commit_sha[:12]}（{len(entries)} 個檔案變更）")

    tree_items = []
    for entry in entries:
        path = entry["path"]
        if entry["new_mode"] == "160000":
            raise SystemExit(f"尚不支援 submodule: {path}")
        if entry["status"] == "D" or entry["new_sha"].strip("0") == "":
            tree_items.append({"path": path, "mode": entry["old_mode"], "type": "blob", "sha": None})
            print(f"  刪除 {path}")
            continue
        content = git("cat-file", "blob", entry["new_sha"], binary=True).stdout
        print(f"  上傳 {path} ({len(content)} bytes)")
        blob = api.request(
            "POST",
            api.repo_path("/git/blobs"),
            {"content": base64.b64encode(content).decode("ascii"), "encoding": "base64"},
            timeout=300,
        )
        tree_items.append({"path": path, "mode": entry["new_mode"], "type": "blob", "sha": blob["sha"]})

    tree_body = {"tree": tree_items}
    if parents:
        tree_body["base_tree"] = base_tree
    created_tree = api.request("POST", api.repo_path("/git/trees"), tree_body)
    if created_tree["sha"] != local_tree:
        print(f"  警告: tree {created_tree['sha']} != 本地 {local_tree}")

    created = api.request(
        "POST",
        api.repo_path("/git/commits"),
        {
            "message": commit["message"],
            "tree": created_tree["sha"],
            "parents": parents,
            "author": commit["author"],
            "committer": commit["committer"],
        },
    )
    print(f"  遠端 commit {created['sha'][:12]}")
    return created["sha"]


def push_via_api(api: GitHubAPI, remote: str, branch: str) -> None:
    local_head = git("rev-parse", "HEAD").stdout_text.strip()
    try:
        ref = api.request("GET", api.repo_path(f"/git/ref/heads/{branch}"))
        remote_sha = ref["object"]["sha"]
    except SystemExit as exc:
        if "404" not in str(exc):
            raise
        remote_sha = None

    if remote_sha == local_head:
        print("遠端已是最新，無需推送")
        return

    if remote_sha:
        contains = git("merge-base", "--is-ancestor", remote_sha, local_head, check=False)
        if contains.returncode != 0:
            raise SystemExit(
                f"遠端 {branch} ({remote_sha[:12]}) 不是目前 HEAD 的祖先，拒絕非快轉推送"
            )
        rev_range = f"{remote_sha}..HEAD"
    else:
        rev_range = "HEAD"

    commits = [
        line
        for line in git("rev-list", "--reverse", rev_range).stdout_text.splitlines()
        if line
    ]
    if not commits:
        print("沒有需要推送的 commit")
        return

    print(f"改走 api.github.com，準備推送 {len(commits)} 個 commit")
    last_sha = remote_sha
    for sha in commits:
        last_sha = push_commit_via_api(api, sha)

    if remote_sha:
        api.request(
            "PATCH",
            api.repo_path(f"/git/refs/heads/{branch}"),
            {"sha": last_sha, "force": False},
        )
    else:
        api.request(
            "POST",
            api.repo_path("/git/refs"),
            {"ref": f"refs/heads/{branch}", "sha": last_sha},
        )
    git("update-ref", f"refs/remotes/{remote}/{branch}", last_sha)
    print(f"已更新 {remote}/{branch} -> {last_sha[:12]}")


def main() -> int:
    parser = argparse.ArgumentParser(description="推送到 GitHub：先 git push，失敗則改走 API")
    parser.add_argument("--remote", default="origin")
    parser.add_argument("--branch", default="")
    parser.add_argument("--api-only", action="store_true", help="跳過 git push，直接走 API")
    parser.add_argument("--git-only", action="store_true", help="只嘗試 git push")
    parser.add_argument("--timeout", type=int, default=20, help="git push 逾時秒數")
    args = parser.parse_args()

    root = repo_root()
    os.chdir(root)
    load_env_file(root / ".env")
    token = token_from_env()
    if not token:
        print("找不到 Token。請在 .env 設定 GITHUB_PUSH_TOKEN（可複製 .env.example）。", file=sys.stderr)
        return 1

    tracked_env = git("ls-files", "--error-unmatch", ".env", check=False)
    if tracked_env.returncode == 0:
        print("警告: .env 已被 git 追蹤，請立刻從版本庫移除，避免 Token 外洩。", file=sys.stderr)

    branch = args.branch or current_branch()
    owner, repo = parse_owner_repo(args.remote)
    print(f"目標 {owner}/{repo} 分支 {branch}")

    if not args.api_only:
        if try_native_git_push(token, args.remote, branch, args.timeout):
            return 0
        if args.git_only:
            return 1

    api = GitHubAPI(token, owner, repo)
    push_via_api(api, args.remote, branch)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit("已中斷")
