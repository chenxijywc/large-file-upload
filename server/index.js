const express = require('express')
var bodyParser = require('body-parser');
const os = require('os')
const cors = require('cors');  

//创建wab 服务器
const app = express()

// 解析 application/json
app.use(bodyParser.json()); 
// 解析 application/x-www-form-urlencoded
app.use(bodyParser.urlencoded());

app.use(cors())

//监听post请求
app.post('/updata', cors(), (req,res)=>{
    console.log(req.body,'req')
    // file: 'd1886197f363c537534a9046d5f7f54c',
    // sliceFileSize: 5242880,
    // index: 1,
    // fileSize: 15729073,
    // fileName: '爱剪辑-我的视频44.mp4',
    // sliceNumber: 4,
    // userId: '5421-1672847548219'
    if(req.body.index === 0){
        // 下标为0的5秒后再返回回去,测试返回时间
        setTimeout(() => {
            res.send({result:1,msg:'接收成功'})
        }, 5000)
    }else{
        res.send({result:1,msg:'接收成功'})
    }
})
app.get('/isTest', cors(), (req,res)=>{
    res.send('hellowWorld')
})

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
    console.log(`${getIPAdress()}:3000`,'启动成功')
  })