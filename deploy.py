import os, subprocess

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# 1. 注册
print('==> 运行 build.py...')
subprocess.run(['python', 'build.py'], check=True)

# 2. 提交
print('==> 提交到 Git...')
subprocess.run(['git', 'add', 'data.js'], check=True)
subprocess.run(['git', 'commit', '-m', '更新索引'], check=True)

# 3. 推送
print('==> 推送到 GitHub...')
subprocess.run(['git', 'push'], check=True)

print('完成！')
input('按 Enter 退出...')
