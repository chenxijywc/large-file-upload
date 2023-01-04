const express = require('express')
var bodyParser = require('body-parser');
const os = require('os')

const port = 3000

//创建wab 服务器
const app = express()

// 解析 application/json
app.use(bodyParser.json()); 
// 解析 application/x-www-form-urlencoded
app.use(bodyParser.urlencoded());

//监听post请求
app.post('./updata', (req,res)=>{
    //通过post的方式传递过来的参数,通过req.query是无法获取的,因为post的请求参数在请求体里
    //要拿到通过post方式传递过来的参数,就要使用第三方包:body-parser:json对象,multer:formData
    //body-parser:req.body multer:req.file,req.body
    console.log(req,'req')
    res.send({
        result:1,
        msg:'请求成功'
    })
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

  app.listen(port, () => {
    console.log(`${getIPAdress()}:${port}`,'启动成功')
  })