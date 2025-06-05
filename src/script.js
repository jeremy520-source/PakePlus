const CONFIG = {
    API_BASE_URL: 'http://localhost:9901/api'
};

// 添加全局变量存储待删除的版本信息
let deleteInfo = {
    platform: '',
    version: ''
};

document.addEventListener('DOMContentLoaded', function() {
    // 检查后端连接并加载版本信息
    checkBackendAndLoadVersions();

    // 导航切换功能
    const navItems = document.querySelectorAll('.nav-item');
    const platformContents = document.querySelectorAll('.platform-content');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有active类
            navItems.forEach(nav => nav.classList.remove('active'));
            platformContents.forEach(content => content.classList.remove('active'));

            // 添加active类到当前选中项
            this.classList.add('active');
            const targetId = this.dataset.target;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 上传功能相关
    const modal = document.getElementById('uploadModal');
    const uploadButtons = document.querySelectorAll('.upload-btn');
    const closeBtn = document.querySelector('.close');
    let currentPlatform = '';

    // 打开模态框
    uploadButtons.forEach(button => {
        button.addEventListener('click', function() {
            currentPlatform = this.dataset.platform;
            modal.style.display = 'block';
        });
    });

    // 关闭模态框
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // 处理表单提交
    document.getElementById('uploadForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const password = document.getElementById('password').value;
        const version = document.getElementById('version').value;
        const description = document.getElementById('description').value;
        const filePath = document.getElementById('filePath').value;

        // 先验证文件路径
        fetch(`${CONFIG.API_BASE_URL}/verify-path?path=${encodeURIComponent(filePath)}`)
            .then(response => response.json())
            .then(data => {
                if (!data.valid) {
                    alert(`上传失败：${data.message}`);
                    return;
                }

                // 文件存在，继续上传流程
                return fetch(`${CONFIG.API_BASE_URL}/upload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        password: password,
                        platform: currentPlatform,
                        version: version,
                        description: description,
                        filePath: filePath
                    })
                });
            })
            .then(response => {
                if (!response) return; // 如果文件验证失败，response会是undefined
                return response.json();
            })
            .then(data => {
                if (!data) return; // 如果文件验证失败，data会是undefined
                
                if (data.error) {
                    // 显示具体的错误信息
                    if (data.error.includes("版本号已存在")) {
                        alert("版本号已存在，请使用新的版本号");
                        // 聚焦到版本号输入框
                        document.getElementById('version').focus();
                        return;
                    }
                    alert(data.error);
                    return;
                }

                // 重新加载当前平台的版本列表
                loadVersions(currentPlatform);

                // 关闭模态框并重置表单
                modal.style.display = 'none';
                this.reset();
                
                alert('上传成功');
            })
            .catch(error => {
                alert('操作失败：' + error);
            });
    });

    // 添加密码显示切换功能
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');

    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        // 可选：切换图标
        this.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });

    // 删除模态框关闭按钮
    const closeDeleteBtn = document.querySelector('.close-delete');
    const deleteModal = document.getElementById('deleteModal');

    closeDeleteBtn.addEventListener('click', () => {
        deleteModal.style.display = 'none';
        document.getElementById('deleteForm').reset();
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.style.display = 'none';
            document.getElementById('deleteForm').reset();
        }
    });

    // 处理删除表单提交
    document.getElementById('deleteForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const password = document.getElementById('deletePassword').value;

        fetch(`${CONFIG.API_BASE_URL}/delete-version`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password: password,
                platform: deleteInfo.platform,
                version: deleteInfo.version
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            // 删除成功后重新加载版本列表
            loadVersions(deleteInfo.platform);
            // 关闭模态框并重置表单
            deleteModal.style.display = 'none';
            this.reset();
            alert('版本删除成功');
        })
        .catch(error => {
            alert('删除失败：' + error);
        });
    });

    // 为删除密码框添加显示切换功能
    const deleteTogglePassword = document.querySelector('#deleteModal .toggle-password');
    const deletePasswordInput = document.getElementById('deletePassword');

    deleteTogglePassword.addEventListener('click', function() {
        const type = deletePasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        deletePasswordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });
});

// 检查后端连接并加载版本信息
function checkBackendAndLoadVersions() {
    // 添加加载提示
    const platforms = [
        'rk3588-common',
        'rk3588-meter',
        'rk3588-split',
        'android',
        'x86-common',
        'x86-meter'
    ];
    platforms.forEach(platform => {
        const versionList = document.querySelector(`#${platform} .version-list`);
        versionList.innerHTML = '<div class="loading">正在加载版本信息...</div>';
    });

    // 检查后端连接
    fetch(`${CONFIG.API_BASE_URL}/versions/rk3588-common`)
        .then(response => {
            if (!response.ok) {
                throw new Error('后端服务响应异常');
            }
            return response.json();
        })
        .then(() => {
            // 后端接正常，加载所有版本信息
            loadAllVersions();
        })
        .catch(error => {
            console.error('后端连接失败：', error);
            // 显示错误信息
            platforms.forEach(platform => {
                const versionList = document.querySelector(`#${platform} .version-list`);
                versionList.innerHTML = `
                    <div class="error-message">
                        <div class="error-icon">⚠️</div>
                        <div class="error-text">
                            <h3>后端未连接</h3>
                            <p>请联系JMS管理员进行处理</p>
                        </div>
                    </div>
                `;
            });

            // 禁用所有上传按钮
            document.querySelectorAll('.upload-btn').forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            });
        });
}

// 加载所有平台的版本信息
function loadAllVersions() {
    const platforms = [
        'rk3588-common',
        'rk3588-meter',
        'rk3588-split',
        'android',
        'x86-common',
        'x86-meter'
    ];
    platforms.forEach(platform => {
        loadVersions(platform);
    });
}

// 加载指定平台的版本信息
// function loadVersions(platform) {
//     fetch(`${CONFIG.API_BASE_URL}/versions/${platform}`)
//         .then(response => response.json())
//         .then(versions => {
//             const versionList = document.querySelector(`#${platform} .version-list`);
//             versionList.innerHTML = ''; // 清空现有内容

//             versions.forEach(version => {
//                 const card = createVersionCard(version, platform);
//                 versionList.appendChild(card);
//             });
//         })
//         .catch(error => console.error('加载版本信息失败：', error));
// }

function loadVersions(platform) {
    fetch(`${CONFIG.API_BASE_URL}/versions/${platform}`)
        .then(response => response.json())
        .then(versions => {
            const versionList = document.querySelector(`#${platform} .version-list`);
            versionList.innerHTML = '';
            console.log(versions);

            // 添加数据检查
            if (!Array.isArray(versions)) {
                console.error('返回的数据不是数组格式:', versions);
                versionList.innerHTML = '<div class="error">加载版本信息失败</div>';
                return;
            }

            if (versions.length === 0) {
                versionList.innerHTML = '<div class="empty">暂无版本信息</div>';
                return;
            }

            versions.forEach(version => {
                const card = createVersionCard(version, platform);
                versionList.appendChild(card);
            });
        })
        .catch(error => {
            console.error('加载版本信息失败：', error);
            const versionList = document.querySelector(`#${platform} .version-list`);
            versionList.innerHTML = '<div class="error">加载版本信息失败</div>';
        });
}




// 创建版本卡片
function createVersionCard(version, platform) {
    const card = document.createElement('div');
    card.className = 'version-card';
    card.innerHTML = `
        <h3>${version.version}</h3>
        <div class="version-info">
            <p>发布时间：${version.date}</p>
            <p>更新说明：${version.description}</p>
        </div>
        <div class="card-actions">
            <button class="download-btn" data-version="${version.version}" data-algo="${platform}" data-path="${version.filePath}">
                下载此版本
            </button>
            <button class="delete-btn" data-version="${version.version}" data-platform="${platform}">
                删除版本
            </button>
        </div>
    `;

    // 为下载按钮添加事件监听
    const downloadBtn = card.querySelector('.download-btn');
    downloadBtn.addEventListener('click', function() {
        downloadAlgorithm(this.dataset.algo, this.dataset.version, this.dataset.path);
    });

    // 为删除按钮添加事件监听
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', function() {
        deleteVersion(this.dataset.platform, this.dataset.version);
    });

    return card;
}

// 修改下载函数
function downloadAlgorithm(algo, version, filePath) {
    if (!filePath) {
        alert('文件路径不存在！');
        return;
    }

    // 弹出密码输入框
    const password = prompt('请输入下载密码：');
    if (!password) return;  // 用户取消输入

    // 先验证文件路径
    fetch(`${CONFIG.API_BASE_URL}/verify-path?path=${encodeURIComponent(filePath)}`)
        .then(response => response.json())
        .then(data => {
            if (!data.valid) {
                alert(`下载失败：${data.message}`);
                return;
            }
            // 文件存在，执行下载（带密码）
            fetch(`${CONFIG.API_BASE_URL}/download?path=${encodeURIComponent(filePath)}&password=${encodeURIComponent(password)}`)
                .then(response => {
                    if (response.ok) {
                        // 下载成功，获取文件名
                        const contentDisposition = response.headers.get('content-disposition');
                        const fileName = contentDisposition ? 
                            contentDisposition.split('filename=')[1] : 
                            filePath.split('/').pop();
                        
                        return response.blob().then(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileName;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                        });
                    } else {
                        // 处理错误响应
                        return response.json().then(data => {
                            throw new Error(data.error || '下载失败');
                        });
                    }
                })
                .catch(error => {
                    alert(error.message);
                });
        })
        .catch(error => {
            alert('验证文件路径时出错：' + error);
        });
}

// 修改删除版本的函数
function deleteVersion(platform, version) {
    // 存储待删除的版本信息
    deleteInfo.platform = platform;
    deleteInfo.version = version;
    
    // 显示删除确认模态框
    const deleteModal = document.getElementById('deleteModal');
    deleteModal.style.display = 'block';
} 