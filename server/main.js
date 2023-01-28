const express = require('express')
const bodyParser = require('body-parser')
const os = require('os')
const cors = require('cors')
const path = require('path')

//创建wab 服务器
const app = express()

// 静态文件托管
let staticPath = path.join(__dirname,'static')
app.use(express.static(staticPath))

// 解析 application/json
app.use(bodyParser.json()); 
// 解析 application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors())

// 添加路由到应用上
app.use('/',require('./routes/index'))

// 获取ip地址
function getIPAdress() {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
  }

  app.listen(3000, () => {
    console.log(`http://${getIPAdress()}:3000`,'启动成功')
  })