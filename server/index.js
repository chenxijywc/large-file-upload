const express = require('express')
var bodyParser = require('body-parser');
const os = require('os')
const cors = require('cors');  
const path = require('path');  
var fs = require('fs');

//创建wab 服务器
const app = express()

// 静态文件托管,可能以后用的上
let staticPath = path.join(__dirname,'static')
app.use(express.static(staticPath))

// 解析 application/json
app.use(bodyParser.json()); 
// 解析 application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors())

//监听post请求
app.post('/updata', cors(), (req,res)=>{
    // file: 'd1886197f363c537534a9046d5f7f54c',
    // sliceFileSize: 5242880,
    // index: 1,
    // fileSize: 15729073,
    // fileName: '爱剪辑-我的视频44.mp4',
    // sliceNumber: 4,
    // userId: '54211672847548219'
    let {index,userId,file,sliceNumber} = req.body
    // 看里边有没完全一样的文件名,没有就添加一个新的
    let insideFileName = `${userId}-${index}`
    // 读取目录
    fs.readdir(staticPath,async(err,files)=>{
        if(!err){
            let insideFileNameArr = files.map(item => item.replace(/.txt/g, ''))
            let otherArr = insideFileNameArr.filter(item => ~item.indexOf(userId))
            if(otherArr.length === sliceNumber-1){
                let allStr = ''
                let allFileArr = [{index,file}]
                for (const item of otherArr) {
                    let filePath = getStaticPath(item)
                    let fileContent = fs.readFileSync(filePath,'utf8')
                    fs.unlink(filePath,(err)=>{})
                    let needIndex = item.split('-')[1]
                    allFileArr.push({index:Number(needIndex),file:fileContent})
                }
                for (let i = 0; i < allFileArr.length; i++) {
                    let needObj = allFileArr.filter(item => item.index === i)[0]
                    allStr += needObj.file
                }
                // 查数据库里有没这条数据,没有就新增到数据库,有就直接返回所有接收完成
                console.log(allStr,'完整的字符串')
                res.send({result:1,msg:'所有接收完成'})
            }else{
                // 创建文件
                fs.writeFile(getStaticPath(insideFileName),file,(err)=>{
                    if(!err){
                        res.send({result:1,msg:'单片接收成功'})
                    }
                })
            }
        }
    })
})
app.get('/', cors(), (req,res)=>{
    res.send('欢迎来到大文件上传')
})

// 读取所有文件
function isReadFile(fileName){
    new Promise((resolve,reject)=>{
        fs.readFile(getStaticPath(fileName),'utf-8',(err,data)=>{
            if(!err){
                resolve(data)
            }else{
                reject(err)
            }
        })  
    })
}

// 获取文件的路径
function getStaticPath(fileName){
    return path.join(staticPath,`${fileName}.txt`)
}

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