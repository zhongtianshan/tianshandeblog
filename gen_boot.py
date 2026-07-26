#!/usr/bin/env python3
"""生成真实感的 Linux 内核启动日志 (dmesg 风格) — 128行"""
import random

random.seed(42)

ts = 0.0

def t():
    global ts
    ts += random.uniform(0.002, 0.06)
    return ts

lines = []

# — CPU / 平台 (8条)
lines.append((t(), '[LINUX] Linux version 6.1.42-arch1-1 (linux@archlinux)'))
lines.append((t(), '[LINUX] x86_64 CPU @ 2.50GHz, family 6 model 42'))
lines.append((t(), '[LINUX] CPU features: SSE4.1 SSE4.2 AVX2 AES-NI RDRAND'))
lines.append((t(), '[LINUX] CPU features: SMEP SMAP PTI IBRS IBPB'))
lines.append((t(), '[LINUX] SMP: 4 cores / 8 threads activated'))
lines.append((t(), '[LINUX] Command line: root=/dev/sda2 quiet splash'))
lines.append((t(), '[LINUX] Kernel image: 0x1000000 - 0x12fffff'))

# — ACPI (10条)
lines.append((t(), '[ACPI]   RSDP 0x' + hex(random.randint(0x80000000, 0xFFFFFFFF))[2:].zfill(16)))
lines.append((t(), '[ACPI]   RSDT 0x' + hex(random.randint(0x80000000, 0xFFFFFFFF))[2:].zfill(8)))
lines.append((t(), '[ACPI]   XSDT 0x' + hex(random.randint(0x80000000, 0xFFFFFFFF))[2:].zfill(16)))
lines.append((t(), '[ACPI]   DSDT loaded: 142 tables'))
lines.append((t(), '[ACPI]   FADT: rev 6, 0x' + hex(random.randint(0x80000000, 0xFFFFFFFF))[2:].zfill(8)))
lines.append((t(), '[ACPI]   SSDT: CPU-PM loaded'))
lines.append((t(), '[ACPI]   SSDT: GPU-PM loaded'))
lines.append((t(), '[ACPI]   SSDT: TBT loaded'))
lines.append((t(), '[ACPI]   PM timer: 3.579MHz, IRQ 9'))
lines.append((t(), '[ACPI]   Enabled 2 GPEs'))

# — 内存 (10条)
mem_total = random.choice([8192, 16384, 32768])
mem_free = mem_total - random.randint(400, 1200)
lines.append((t(), f'[MEM]   e820: {mem_total}MB available ({mem_free}MB free)'))
lines.append((t(), '[MEM]   DMA zone: 4096 pages (4KB)'))
lines.append((t(), '[MEM]   DMA32 zone: 1048576 pages (4KB)'))
lines.append((t(), '[MEM]   Normal zone: 4194304 pages (4KB)'))
lines.append((t(), '[MEM]   HighMem zone: 0 pages'))
lines.append((t(), '[MEM]   Initializing page tables... OK'))
lines.append((t(), '[MEM]   Detected memory: ' + str(mem_total) + 'MB'))
lines.append((t(), '[MEM]   NX: Execute Disable enabled'))
lines.append((t(), '[MEM]   SMBIOS: v3.4 present'))
lines.append((t(), '[MEM]   DMA pool: 8192 KiB reserved'))

# — PCI 总线 (16条)
lines.append((t(), '[PCI]   PCI BIOS revision 3.00'))
lines.append((t(), '[PCI]   Probing PCI hardware (00:00.0 - 00:1F.7)'))
buses = ['00:00.0', '00:01.0', '00:02.0', '00:14.0', '00:14.2',
         '00:16.0', '00:17.0', '00:1b.0', '00:1c.0', '00:1d.0',
         '00:1f.2', '00:1f.3', '01:00.0', '02:00.0', '03:00.0']
for bus in buses:
    vendor = random.choice(['8086', '10ec', '1022', '1002', '1b21'])
    dev = hex(random.randint(0x1000, 0xFFFF))[2:]
    rev = random.randint(0, 3)
    lines.append((t(), f'[PCI]   {bus} vendor={vendor} device={dev} rev={rev:02x}'))

# — ATA / 存储 (12条)
for port in ['ata1', 'ata2', 'ata3', 'ata4']:
    speed = random.choice(['6.0 Gbps', '3.0 Gbps', '1.5 Gbps'])
    lines.append((t(), f'[ATA]   {port}: SATA link up ({speed})'))
drives = [
    ('ata1.00', 'SAMSUNG SSD 870 EVO 500GB', '976773168'),
    ('ata2.00', 'WDC WD40EZRZ 4TB', '7814037168'),
    ('ata3.00', 'KINGSTON A400 240GB', '468862128'),
]
for dev, model, sectors in drives:
    lines.append((t(), f'[ATA]   {dev}: {model}'))
    lines.append((t(), f'[ATA]   {dev}: {sectors} sectors'))
lines.append((t(), '[ATA]   SATA controller: AHCI v1.31'))

# — 文件系统 (10条)
lines.append((t(), '[EXT4]  sda1: mounted /boot (ext4, ro)'))
lines.append((t(), '[EXT4]  sda2: mounted / (ext4, rw)'))
lines.append((t(), '[EXT4]  sda3: mounted /home (ext4, rw)'))
lines.append((t(), '[EXT4]  sdb1: mounted /mnt/data (ext4, rw)'))
lines.append((t(), '[EXT4]  Journal inode found at 0x' + hex(random.randint(0x1000, 0xFFFF))[2:]))
lines.append((t(), '[EXT4]  Journal inode found at 0x' + hex(random.randint(0x1000, 0xFFFF))[2:]))
lines.append((t(), '[EXT4]  Recovery complete (0 transactions)'))
lines.append((t(), '[EXT4]  ' + str(random.randint(50000, 200000)) + ' inodes, ' + str(random.randint(200000, 800000)) + ' blocks'))
lines.append((t(), '[XFS]   sdb1: mounted, logdev internal'))
lines.append((t(), '[FS]   VFS: Mounted root (ext4 filesystem)'))

# — 网络 (10条)
lines.append((t(), '[NET]   IPv6: enabled, privacy extensions'))
lines.append((t(), '[NET]   IPv4: packet forwarding disabled'))
lines.append((t(), '[NET]   eth0: Realtek RTL8169 at 0x' + hex(random.randint(0xA0000000, 0xAFFFFFFF))[2:]))
lines.append((t(), '[NET]   eth0: MAC ' + ':'.join([hex(random.randint(0,255))[2:].zfill(2).upper() for _ in range(6)])))
lines.append((t(), '[NET]   eth0: link UP (1000Mbps/Full)'))
lines.append((t(), '[NET]   IPv4: DHCP lease 192.168.1.' + str(random.randint(2, 254)) + ' received'))
lines.append((t(), '[NET]   IPv4: gateway 192.168.1.1 reachable'))
lines.append((t(), '[NET]   DNS: 8.8.8.8, 8.8.4.4'))
lines.append((t(), '[NET]   wlan0: Intel Wireless-AC 9260'))
lines.append((t(), '[NET]   wlan0: scan completed (6 APs)'))

# — USB (10条)
lines.append((t(), '[USB]   usb1: xHCI host controller (x86_64)'))
lines.append((t(), '[USB]   usb1: 6 ports detected'))
lines.append((t(), '[USB]   usb2: xHCI host controller (x86_64)'))
lines.append((t(), '[USB]   usb2: 6 ports detected'))
for port, dev in [('1-2', 'HID keyboard (Logitech)'), ('1-3', 'HID mouse (Logitech)'),
                  ('1-6', 'USB 3.0 hub'), ('2-1', 'USB flash drive (SanDisk)')]:
    lines.append((t(), f'[USB]   usb {port}: {dev}'))
lines.append((t(), '[USB]   usb-storage: devices scanned'))
lines.append((t(), '[INPUT] mousedev: PS/2 mouse device common'))

# — 声音 (8条)
lines.append((t(), '[ALSA]  hdaudio: HDA Intel PCH at 0x' + hex(random.randint(0xA0000000, 0xAFFFFFFF))[2:]))
lines.append((t(), '[ALSA]  hdaudio: codec #0: Realtek ALC1220'))
lines.append((t(), '[ALSA]  hdaudio: codec #1: NVIDIA HDMI/DP'))
lines.append((t(), '[ALSA]  Audio device initialized'))
lines.append((t(), '[ALSA]  hdmi: HDMI/DP PCM supported'))
lines.append((t(), '[ALSA]  hdmi: max channels: 8'))
lines.append((t(), '[ALSA]  Control device: hw:CARD=PCH'))

# — GPU / DRM (8条)
lines.append((t(), '[DRM]   i915: Intel HD Graphics 630'))
lines.append((t(), '[DRM]   i915: 4096MB VRAM, 256MB stolen'))
lines.append((t(), '[DRM]   i915: resolution 1920x1080 @ 60Hz'))
lines.append((t(), '[DRM]   fb0: switching to inteldrmfb'))
lines.append((t(), '[DRM]   Initialized i915 1.6.0'))
lines.append((t(), '[FB]    Console: switching to color frame buffer'))
lines.append((t(), '[FB]    1920x1080, 32bpp'))

# — 杂项设备 (10条)
lines.append((t(), '[RNG]   random: crng init done'))
lines.append((t(), '[TPM]   TPM 2.0 device detected'))
lines.append((t(), '[TPM]   measured boot: PCR 0-7 ok'))
lines.append((t(), '[TPM]   TPM cmd: startup clear'))
lines.append((t(), '[SEC]   Lockdown: integrity enabled'))
lines.append((t(), '[SEC]   Loaded 3 keyring keys'))
lines.append((t(), '[BT]    Bluetooth: HCI v5.1'))
lines.append((t(), '[BT]    Bluetooth: firmware loaded'))
lines.append((t(), '[EDAC]  MC0: corrected errors: 0'))
lines.append((t(), '[WDT]   watchdog: pretimeout enabled'))

# — 内核收尾 (8条)
lines.append((t(), '[SYS]   Kernel boot completed. PID 1: init'))
lines.append((t(), '[SYS]   freeing unused kernel memory: 2048K'))
lines.append((t(), '[SYS]   rodata_test: all tests passed'))

# — systemd 服务 (剩余补到128行)
svc_names = [
    'networking.service', 'systemd-logind.service', 'sshd.service',
    'cronie.service', 'bluetooth.service', 'NetworkManager.service',
    'ufw.service', 'docker.service', 'mysql.service', 'nginx.service',
    'redis.service', 'postfix.service', 'dbus.service', 'polkit.service',
    'getty@tty1.service', 'syslog-ng.service', 'dhcpcd.service',
    'lm-sensors.service', 'irqbalance.service', 'cups.service',
    'avahi-daemon.service', 'ntpd.service', 'upower.service',
    'thermald.service', 'acpid.service',
]
for svc in svc_names:
    lines.append((t(), '[SYS]   Service: ' + svc + '............ OK'))

# 最后一条
lines.append((t(), '[SYS]   Startup complete in ' + str(round(ts, 2)) + 's'))

# 排序
lines.sort(key=lambda x: x[0])

# 截取 128 行
lines = lines[:128]

out = []
for _, msg in lines:
    out.append("        '> " + msg + "',")

print('\n'.join(out))
import sys
print(f'// 共 {len(lines)} 行', file=sys.stderr)
