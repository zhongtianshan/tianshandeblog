import os, subprocess, sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# 1. 注册
print('==> 运行 build.py...')
subprocess.run(['python', 'build.py'], check=True)

# 2. 提交
print('==> 提交到 Git...')
subprocess.run(['git', 'add', '-A'], check=True)
# 检查是否有变更，有才提交
r = subprocess.run(['git', 'diff', '--cached', '--quiet'])
if r.returncode == 0:
    print('没有新变更，跳过提交')
    sys.exit(0)
subprocess.run(['git', 'commit', '-m', '更新索引'], check=True)

# 3. 推送
print('==> 推送到 GitHub...')
subprocess.run(['git', 'push'], check=True)

print('完成！')
input('按 Enter 退出...')
