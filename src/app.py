'''
Description: 
Autor: MS
Date: 2024-11-27 11:26:47
LastEditors: MS
LastEditTime: 2024-11-28 15:28:03
'''
from flask import Flask, send_file, jsonify, request
from flask_cors import CORS
import os
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)  # 启用跨域支持

# 加载配置
CONFIG_FILE = 'config.json'
def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {"versions": {}}         

def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=4)

# 验证文件路径是否存在
def verify_file_path(file_path):
    if not file_path:
        return False, "文件路径不能为空"
    if not os.path.exists(file_path):
        return False, "文件路径不存在"
    if not os.path.isfile(file_path):
        return False, "路径不是一个有效的文件"
    return True, "文件验证通过"

# 验证版本号是否已存在
def check_version_exists(platform, version, config):
    if platform in config["versions"]:
        for ver_info in config["versions"][platform]:
            if ver_info["version"].lower() == version.lower():  # 不区分大小写比较
                return True
    return False

# 下载接口
@app.route('/api/download')
def download_file():
    file_path = request.args.get('path')
    password = request.args.get('password')  # 获取密码参数

    # 验证密码
    if not password or password != 'qwert':
        return jsonify({"error": "下载密码错误"}), 403
    
    is_valid, message = verify_file_path(file_path)
    if not is_valid:
        return jsonify({"error": message}), 404
    
    try:
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 验证文件路径接口
@app.route('/api/verify-path')
def verify_path():
    file_path = request.args.get('path')
    print(file_path)
    is_valid, message = verify_file_path(file_path)
    return jsonify({
        "valid": is_valid,
        "message": message
    })

# 上传新版本信息接口
@app.route('/api/upload', methods=['POST'])
def upload_version():
    data = request.json
    if not data or 'password' not in data or data['password'] != 'anhui':
        return jsonify({"error": "密码错误"}), 403

    file_path = data.get('filePath')
    is_valid, message = verify_file_path(file_path)
    
    if not is_valid:
        return jsonify({"error": message}), 400

    config = load_config()
    platform = data.get('platform')
    version = data.get('version')

    # 检查版本号是否已存在
    if check_version_exists(platform, version, config):
        return jsonify({"error": "版本号已存在，请使用新的版本号"}), 400

    version_info = {
        "version": version,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "description": data.get('description'),
        "filePath": file_path
    }

    if platform not in config["versions"]:
        config["versions"][platform] = []
    
    config["versions"][platform].insert(0, version_info)
    save_config(config)
    
    return jsonify({"message": "上传成功"})

# 获取版本列表接口
@app.route('/api/versions/<platform>')
def get_versions(platform):
    config = load_config()
    versions = config["versions"].get(platform, [])
    print(versions)
    return jsonify(versions)

# 删除版本接口
@app.route('/api/delete-version', methods=['POST'])
def delete_version():
    data = request.json
    if not data or 'password' not in data or data['password'] != 'anhui':
        return jsonify({"error": "密码错误"}), 403

    platform = data.get('platform')
    version = data.get('version')
    
    config = load_config()
    
    if platform not in config["versions"]:
        return jsonify({"error": "平台不存在"}), 404
    
    # 查找并删除指定版本
    version_list = config["versions"][platform]
    for i, ver in enumerate(version_list):
        if ver["version"].lower() == version.lower():
            # 删除版本前先检查文件是否存在，如果存在可以选择一并删除
            file_path = ver["filePath"]
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"删除文件失败: {e}")
            
            # 从列表中删除版本信息
            del version_list[i]
            save_config(config)
            return jsonify({"message": "版本删除成功"})
    
    return jsonify({"error": "版本不存在"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8999) 