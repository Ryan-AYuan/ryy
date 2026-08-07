import pygame
import math
import random
from pygame.locals import *
 
pygame.init()
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("夕夕夕夕夕夕夕快乐")
 
BLACK = (0, 0, 0)
PINK = (255, 105, 180)
LIGHT_PINK = (255, 182, 193)
HOT_PINK = (255, 20, 147)
GALAXY_COLORS = [(180, 200, 255), (120, 160, 255), (255, 255, 255), (200, 120, 255)]
 
angle_y = 0
pulse = 0
 
 
def is_in_3d_heart(x, z, y):
    scale = 0.7
    x, y, z = x / scale, y / scale, z / scale
    term1 = (x * x + (9 * y * y) / 4.0 + z * z - 1)
    value = term1 * term1 * term1 - x * x * z * z * z - (9 * y * y * z * z * z) / 80.0
    return value <= 0
 
 
class Particle:
    def __init__(self):
        self.reset()
 
    def reset(self):
        while True:
            x = random.uniform(-1.5, 1.5)
            y = random.uniform(-1.5, 1.5)
            z = random.uniform(-1.5, 1.5)
            if is_in_3d_heart(x, y, z):
                break
        self.x, self.y, self.z = x * 12, y * 12, z * 12
        self.dx = random.uniform(-0.02, 0.02)
        self.dy = random.uniform(-0.02, 0.02)
        self.dz = random.uniform(-0.02, 0.02)
        self.base_color = random.choices([PINK, LIGHT_PINK, HOT_PINK], weights=[0.5, 0.3, 0.2])[0]
        self.base_size = random.uniform(1.5, 3.2)
 
    def update(self, angle_y, pulse_scale):
        self.x += self.dx
        self.y += self.dy
        self.z += self.dz
        if not is_in_3d_heart(self.x / 12, self.y / 12, self.z / 12):
            self.reset()
        x_rot = self.x * math.cos(angle_y) + self.z * math.sin(angle_y)
        z_rot = -self.x * math.sin(angle_y) + self.z * math.cos(angle_y)
        y_rot = self.y
        scale = 25 * pulse_scale
        distance = 20
        x_proj = WIDTH // 2 + int(x_rot * scale)
        y_proj = HEIGHT // 2 - int(y_rot * scale)
        depth_factor = (z_rot + distance) / (2 * distance)
        curr_size = max(2, int(self.base_size * depth_factor * 1.5))
        color_factor = min(1.0, max(0.35, depth_factor * 1.6))
        r = min(255, max(0, int(self.base_color[0] * color_factor)))
        g = min(255, max(0, int(self.base_color[1] * color_factor)))
        b = min(255, max(0, int(self.base_color[2] * color_factor)))
        curr_color = (r, g, b)
        return x_proj, y_proj, curr_size, curr_color, depth_factor
 
    def draw(self, screen, angle_y, pulse_scale):
        x, y, size, color, depth = self.update(angle_y, pulse_scale)
        if 0 <= x < WIDTH and 0 <= y < HEIGHT:
            alpha = int(255 * (0.3 + 0.7 * depth))
            color_with_alpha = (color[0], color[1], color[2], alpha)
            particle_surface = pygame.Surface((size * 2, size * 2), pygame.SRCALPHA)
            pygame.draw.circle(particle_surface, color_with_alpha, (size, size), size)
            screen.blit(particle_surface, (x - size, y - size))
 
 
class GalaxyParticle:
    def __init__(self):
        self.x = random.uniform(0, WIDTH)
        self.y = random.uniform(0, HEIGHT)
        self.z = random.uniform(-30, 30)
        self.size = random.uniform(1, 3)
        self.color = random.choice(GALAXY_COLORS)
        self.base_alpha = random.randint(12, 220)
        self.alpha = self.base_alpha
        self.speed = random.uniform(0.5, 1.5)
        self.angle = random.uniform(-0.2, 0.2)
        self.life = random.randint(60, 120)
        self.fade_speed = random.uniform(0.01, 0.03)
 
    def update(self):
        self.y -= self.speed
        self.x += math.sin(self.angle) * 0.5
        self.size = max(0, self.size - self.fade_speed)
        self.life -= 1
        if self.life < 30:
            self.alpha = int(self.alpha * self.life / 30)
        return self.life > 0 and self.y > 0 and self.size > 0
 
    def draw(self, screen):
        particle_surface = pygame.Surface((int(self.size * 3), int(self.size * 3)), pygame.SRCALPHA)
        pygame.draw.circle(particle_surface, (*self.color, self.alpha), (int(self.size), int(self.size)),
                           int(self.size))
        screen.blit(particle_surface, (int(self.x - self.size), int(self.y - self.size)))
 
 
# 爱心底部掉落粒子类
class ParticleDrop:
    def __init__(self, heart_particles):
        source_particle = random.choice(heart_particles)
        x_proj, y_proj, _, color, _ = source_particle.update(angle_y, pulse)
        self.x = random.randint(x_proj - 80, x_proj + 80)
        self.y = y_proj + 50
        self.color = color
        self.size = random.uniform(1.5, 3.0)
        self.speed = random.uniform(1.0, 3.0)
        self.alpha = random.randint(180, 255)
        self.fade_speed = random.uniform(1.0, 2.5)
        self.horizontal_speed = random.uniform(-0.5, 0.5)
        self.trail = []  # 尾迹列表
 
    def update(self):
        self.y += self.speed
        self.x += self.horizontal_speed
        self.alpha = max(0, self.alpha - self.fade_speed)
        # 记录尾迹，最多保留 1个点
        self.trail.append((self.x, self.y, self.size, self.alpha))
        if len(self.trail) > 1:
            self.trail.pop(0)
        return self.alpha > 0 and self.y < HEIGHT + 20
 
    def draw(self, screen):
        # 绘制尾迹
        for i, (tx, ty, tsize, talpha) in enumerate(self.trail):
            fade = int(talpha * (i + 1) / len(self.trail))  # 尾迹逐渐变淡
            size = max(1, int(tsize * (i + 1) / len(self.trail)))  # 尾迹逐渐变小
            surf = pygame.Surface((size * 2, size * 2), pygame.SRCALPHA)
            pygame.draw.circle(surf, (*self.color, fade), (size, size), size)
            screen.blit(surf, (int(tx - size), int(ty - size)))
        # 绘制主粒子
        particle_surface = pygame.Surface((int(self.size * 2), int(self.size * 2)), pygame.SRCALPHA)
        pygame.draw.circle(
            particle_surface,
            (*self.color, int(self.alpha)),
            (int(self.size), int(self.size)),
            int(self.size)
        )
        screen.blit(particle_surface, (int(self.x - self.size), int(self.y - self.size)))
 
 
# 初始化粒子系统
particles = [Particle() for _ in range(4000)]
galaxy_particles = []
# 掉落粒子列表
drop_particles = []
 
clock = pygame.time.Clock()
running = True
 
while running:
    for event in pygame.event.get():
        if event.type == QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_LEFT:
                angle_y -= 0.1
            elif event.key == pygame.K_RIGHT:
                angle_y += 0.1
 
    angle_y += 0.014
    pulse = (math.sin(pygame.time.get_ticks() * 0.002) + 1) / 2 * 0.2 + 0.9
 
    screen.fill(BLACK)
 
    fade_surface = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
    fade_surface.fill((0, 0, 0, 18))
    screen.blit(fade_surface, (0, 0))
 
    # 生成星河粒子
    if random.random() < 0.6:
        galaxy_particles.append(GalaxyParticle())
 
    # 生成掉落粒子（控制生成频率）
    if len(drop_particles) < 500 and random.random() < 0.98:  # 限制最大粒子数并控制生成概率
        drop_particles.append(ParticleDrop(particles))
 
    # 更新和绘制星河粒子
    galaxy_particles = [p for p in galaxy_particles if p.update()]
    for p in galaxy_particles:
        p.draw(screen)
 
    # 更新和绘制掉落粒子
    drop_particles = [p for p in drop_particles if p.update()]
    for p in drop_particles:
        p.draw(screen)
 
    # 绘制爱心粒子
    for particle in particles:
        particle.draw(screen, angle_y, pulse)
 
    pygame.display.flip()
    clock.tick(60)
 
pygame.quit()
