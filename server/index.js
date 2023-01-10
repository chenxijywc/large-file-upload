const express = require('express')
const bodyParser = require('body-parser');
const os = require('os')
const cors = require('cors');  
const path = require('path');  
const fs = require('fs');
const mySQL = require('./mySQL');
const multiparty = require("multiparty");

//创建wab 服务器
const app = express()

let sql1 = "select * from files where file = ?;"
let sql2 = "insert into files(file) values(?);"

// 静态文件托管,可能以后用的上
let staticPath = path.join(__dirname,'static')
app.use(express.static(staticPath))

// 解析 application/json
app.use(bodyParser.json()); 
// 解析 application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors())

// 上传
app.post('/update', cors(), (req,res)=>{
    // file: [Object File],
    // sliceFileSize: 5242880,
    // index: 1,
    // fileSize: 15729073,
    // fileName: '爱剪辑-我的视频44.mp4',
    // sliceNumber: 4,
    // fileMd5: '54211672847548219'
    const multipart = new multiparty.Form();
    multipart.parse(req, async (err, fields, files) => {
      if (!err) {
        let file = files[0]
        let {fileMd5,fileName,sliceNumber,index} = fields
        console.log('单片上传完成')
        res.send({result:1,msg:'单片上传完成',data:{fields,files}})
      }else{
        res.send({result:-1,msg:err})
      }
    })  
    // // 看里边有没完全一样的文件名,没有就添加一个新的
    // // 读取目录
    // fs.readdir(staticPath,async(err,files)=>{
    //     if(!err){
    //         let insideFileNameArr = files.map(item => item.replace(/.txt/g, ''))
    //         let otherArr = insideFileNameArr.filter(item => ~item.indexOf(fileMd5))
    //         if(otherArr.length === sliceNumber-1){
    //             let allStr = ''
    //             let allFileArr = [{index,file}]
    //             for (const item of otherArr) {
    //                 let filePath = getStaticPath(item)
    //                 let fileContent = fs.readFileSync(filePath,'utf8')
    //                 fs.unlink(filePath,(err)=>{})
    //                 let needIndex = item.split('-')[1]
    //                 allFileArr.push({index:Number(needIndex),file:fileContent})
    //             }
    //             for (let i = 0; i < allFileArr.length; i++) {
    //                 let needObj = allFileArr.filter(item => item.index === i)[0]
    //                 allStr += needObj.file
    //             }
    //             // 查数据库里有没这条数据,没有就新增到数据库,有就直接返回所有接收完成
    //             // console.log(allStr,'完整的字符串')
    //             mySQL.query(sql1,[allStr],(err1,results,fields) => {
    //                 if (!err1) {
    //                     if(results.length > 0){
    //                         console.log('不用查了,已经有了')
    //                         res.send({result:1,msg:'所有接收完成,你之前已经上传过这个文件了'})
    //                     }else{
    //                         mySQL.query(sql2,[allStr],(err2) => {
    //                             !err2 ? res.send({result:1,msg:'所有接收完成'}) : ''
    //                         })
    //                     }
    //                 }
    //             });
    //         }else{
    //             // 创建文件
    //             fs.writeFile(getStaticPath(insideFileName),file,(err)=>{
    //                 if(!err){
    //                     res.send({result:1,msg:'单片接收成功'})
    //                 }
    //             })
    //         }
    //     }
    // })
})

// 查看有没这个文件
app.post('/checkFile', cors(), (req,res)=>{
    // let {md5} = req.body
    // mySQL.query(sql1,[md5],(err1,results,fields) => {
    //     if (!err1) {
    //         if(results.length > 0){
    //             res.send({result:-1,msg:'你之前已经上传过这个文件了'})
    //         }else{
                res.send({result:1,msg:'你还没上传过这个文件'})
    //         }
    //     }
    // });
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