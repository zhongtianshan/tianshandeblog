#!/usr/bin/env python3
"""生成真实感的 Linux 内核启动日志 (dmesg 风格)"""
import random
import time

random.seed(42)

ts = 0.0  # 内核时间戳

def t():
    global ts
    ts += random.uniform(0.002, 0.08)
    return ts

# ===== 内核启动第一阶段 =====
lines = []

# CPU / 平台
lines.append((t(), '[LINUX] Linux version 6.1.42-arch1-1 (linux@archlinux)'))
lines.append((t(), '[LINUX] x86_64 CPU @ 2.50GHz, family 6 model 42'))
lines.append((t(), '[LINUX] CPU features: SSE4.1 SSE4.2 AVX2 AES-NI RDRAND'))
lines.append((t(), '[LINUX] SMP: 4 cores / 8 threads activated'))
lines.append((t(), '[ACPI]   RSDP 0x00000000' + hex(random.randint(0x80000000, 0xFFFFFFFF))[2:].zfill(8)))
lines.append((t(), '[ACPI]   DSDT loaded: 142 tables'))
lines.append((t(), '[ACPI]   PM timer: 3.579MHz, IRQ 9'))

# 内存
mem_total = random.choice([4096, 8192, 16384])
mem_free = mem_total - random.randint(200, 800)
lines.append((t(), f'[MEM]   e820: {mem_total}MB available ({mem_free}MB free)'))
lines.append((t(), '[MEM]   DMA zone: 4096 pages (4KB)'))
lines.append((t(), '[MEM]   Normal zone: 1048576 pages (4KB)'))
lines.append((t(), '[MEM]   HighMem zone: 0 pages'))
lines.append((t(), '[MEM]   Initializing page tables... OK'))

# PCI 总线
lines.append((t(), '[PCI]   PCI BIOS revision 3.00'))
lines.append((t(), '[PCI]   Probing PCI hardware (00:00.0 - 00:1F.7)'))
for bus in ['00:1d.0', '00:1f.2', '00:1f.3', '01:00.0', '02:00.0']:
    vendor = random.choice(['8086', '10ec', '1022', '1002'])
    dev = hex(random.randint(0x1000, 0xFFFF))[2:]
    lines.append((t(), f'[PCI]   {bus} vendor={vendor} device={dev}'))

# ATA / 存储
lines.append((t(), '[ATA]   ata1: SATA link up (6.0 Gbps)'))
lines.append((t(), '[ATA]   ata1.00: SAMSUNG SSD 870 EVO 500GB'))
lines.append((t(), '[ATA]   ata1.00: 976773168 sectors'))
lines.append((t(), '[ATA]   ata2: SATA link up (3.0 Gbps)'))
lines.append((t(), '[ATA]   ata2.00: WDC WD40EZRZ 4TB'))
lines.append((t(), '[ATA]   ata2.00: 7814037168 sectors'))

# 文件系统
lines.append((t(), '[EXT4]  sda1: mounted /boot (ext4, ro)'))
lines.append((t(), '[EXT4]  sda2: mounted / (ext4, rw)'))
lines.append((t(), '[EXT4]  sda3: mounted /home (ext4, rw)'))
lines.append((t(), '[EXT4]  Journal inode found at 0x' + hex(random.randint(0x1000, 0xFFFF))[2:]))
lines.append((t(), '[EXT4]  Recovery complete (0 transactions)'))

# 网络
lines.append((t(), '[NET]   IPv6: enabled'))
lines.append((t(), '[NET]   IPv4: packet forwarding disabled'))
lines.append((t(), '[NET]   eth0: Realtek RTL8169 at 0x' + hex(random.randint(0xA0000000, 0xAFFFFFFF))[2:]))
lines.append((t(), '[NET]   eth0: link UP (1000Mbps/Full)'))
lines.append((t(), '[NET]   IPv4: DHCP lease 192.168.1.' + str(random.randint(2, 254)) + ' received'))
lines.append((t(), '[NET]   IPv4: gateway 192.168.1.1 reachable'))
lines.append((t(), '[NET]   DNS: 8.8.8.8, 8.8.4.4'))

# USB / 输入
lines.append((t(), '[USB]   usb1: xHCI host controller (x86_64)'))
lines.append((t(), '[USB]   usb1: 6 ports detected'))
lines.append((t(), '[USB]   usb 1-2: HID keyboard (Logitech)'))
lines.append((t(), '[USB]   usb 1-3: HID mouse (Logitech)'))
lines.append((t(), '[INPUT] mousedev: PS/2 mouse device common'))

# 声音
lines.append((t(), '[ALSA]  hdaudio: HDA Intel PCH at 0x' + hex(random.randint(0xA0000000, 0xAFFFFFFF))[2:]))
lines.append((t(), '[ALSA]  hdaudio: codec #0: Realtek ALC1220'))
lines.append((t(), '[ALSA]  hdaudio: codec #1: NVIDIA HDMI/DP'))
lines.append((t(), '[ALSA]  Audio device initialized'))

# GPU
lines.append((t(), '[DRM]   i915: Intel HD Graphics 630'))
lines.append((t(), '[DRM]   i915: 4096MB VRAM, 256MB stolen'))
lines.append((t(), '[DRM]   i915: resolution 1920x1080 @ 60Hz'))
lines.append((t(), '[DRM]   fb0: switching to inteldrmfb'))

# 虚拟化 / 杂项
lines.append((t(), '[RNG]   random: crng init done'))
lines.append((t(), '[TPM]   TPM 2.0 device detected'))
lines.append((t(), '[TPM]   measured boot: PCR 0-7 ok'))
lines.append((t(), '[SEC]   Lockdown: integrity enabled'))
lines.append((t(), '[SYS]   Kernel boot completed. PID 1: init'))

# 关闭时间戳输出，后面只显示信息
lines.append((999, '[SYS]   Entering runlevel 3 (multi-user)'))
lines.append((999, '[SYS]   Service: networking.service............ OK'))
lines.append((999, '[SYS]   Service: systemd-logind.service....... OK'))
lines.append((999, '[SYS]   Service: sshd.service................. OK'))
lines.append((999, '[SYS]   Service: cronie.service............... OK'))
lines.append((999, '[SYS]   Service: bluetooth.service............ OK'))
lines.append((999, '[SYS]   Service: NetworkManager.service....... OK'))
lines.append((999, '[SYS]   Startup complete in ' + str(round(ts, 2)) + 's'))

# 排序（虽然已经是按顺序生成的，保留以防乱序）
lines.sort(key=lambda x: x[0])

# 输出为 JS 数组格式，每行加上 "> " 前缀
out = []
for _, msg in lines:
    out.append("        '> " + msg + "',")

print('\n'.join(out))
print(f'\n// 共 {len(lines)} 行', file=__import__('sys').stderr)
