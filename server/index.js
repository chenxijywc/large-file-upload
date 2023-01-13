const express = require('express')
const bodyParser = require('body-parser')
const os = require('os')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const mySQL = require('./mySQL')
const multiparty = require("multiparty")

//创建wab 服务器
const app = express()

let sql1 = "select * from files where file = ?;"
let sql2 = "insert into files(file) values(?);"
let sql3 = "insert into files set ?;"

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
    const multipart = new multiparty.Form();
    multipart.parse(req, async (err, fields, files) => {
      if (!err) {
        let file = files.file[0]
        let [fileMd5] = fields.fileMd5
        let [fileName] = fields.fileName
        let nameSuffix = fileName.slice(fileName.lastIndexOf('.'),fileName.length) // 文件后缀
        let justMd5 = fileMd5.split('-')[0]
        let folderPath = path.join(staticPath,justMd5)
        let dirPath = path.join(folderPath,`${fileMd5}${nameSuffix}`)
        if(!fs.existsSync(folderPath)){ fs.mkdirSync(folderPath) }  // static文件夹一定要保证有,否则就会报错
        const buffer = fs.readFileSync(file.path)  // 根据file对象的路径获取file对象里的内容
        fs.writeFile(dirPath,buffer,(err)=>{
            if(!err){
                res.send({result:1,msg:'单片上传完成',data:{folderPath,fileMd5,justMd5,nameSuffix,fileName}})
            }
        })
      }else{
        res.send({result:-1,msg:err})
      }
    })  
})

// 根据md5标识合并所有切片
app.post('/mergeSlice', cors(), (req,res)=>{
    let {folderPath,fileMd5,justMd5,nameSuffix,fileName} = req.body
    console.log(folderPath,fileMd5,justMd5,nameSuffix,fileName,'我是合并所有切片接口')
    mergeChunks(folderPath,fileMd5,nameSuffix,(endPathUrl)=>{
        fs.rmdirSync(folderPath)  // 删除文件夹
        let needObj = { url:endPathUrl, name:fileName, md5:justMd5 }
        res.send({result:1,msg:'合并完成'})
        // 放到数据库,响应客户端所有接收完成
        // mySQL.query(sql3,needObj,(err2) => {
        //     !err2 ? res.send({result:1,msg:'所有接收完成'}) : ''
        // })
    })
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

// 合并分片
function mergeChunks(folderPath,fileMd5,nameSuffix,cb){
    fs.readdir(folderPath,(err,data)=>{
        if(!err){
            const pathArr = []
            for (let i = 0; i < data.length; i++) {
                let needPath = data.filter(item => item.split('-')[1].split('.')[0] === String(i))[0]
                pathArr.push(path.join(folderPath,needPath)) 
            }
            console.log(pathArr.length,'pathArr')
            const endPathUrl = path.join(staticPath,`${fileMd5.split('-')[0]}${nameSuffix}`)
            const endWs = fs.createWriteStream(endPathUrl,{flags:'a'})  // 创建可写流,a表示追加内容
            // 将追加添加到文档流封装成一个方法,循环调用
            const addStream = (pathArr)=>{
                let path = pathArr.shift()  // 删除数组的第一个并返回第一个
                const buffer = fs.readFileSync(path)  // 根据file对象的路径获取file对象里的内容
                endWs.write(buffer)  
                fs.unlinkSync(path)  // 追加完就删除文件
                if(pathArr.length > 0){
                    addStream(pathArr)
                }else{
                    endWs.close()
                    cb(endPathUrl)
                }
            }
            addStream(pathArr)
        }
    }) 
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