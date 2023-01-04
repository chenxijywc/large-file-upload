const express = require('express')
var bodyParser = require('body-parser');

//创建wab 服务器
const app = express()

// 解析 application/json
app.use(bodyParser.json()); 
// 解析 application/x-www-form-urlencoded
app.use(bodyParser.urlencoded());

//监听post请求
app.post('/updata', (req,res)=>{
    //通过post的方式传递过来的参数,通过req.query是无法获取的,因为post的请求参数在请求体里
    //要拿到通过post方式传递过来的参数,就要使用第三方包:body-parser:json对象,multer:formData
    //body-parser:req.body multer:req.file,req.body
    console.log(req,'req')
})

//启动服务器, 设置端口号，启动成功回调
app.listen(3000,()=>{
    console.log('启动成功了')
})