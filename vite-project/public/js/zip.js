self.importScripts("jszip.min.js")

self.onmessage = (e) =>{
  const {file,name} = e.data
  try{
    const zip = new JSZip()
    zip.file(name, file, {base64: false})
    //打包
    zip.generateAsync({type:"blob",
       compression: "DEFLATE", // STORE：默认不压缩 DEFLATE：需要压缩
       compressionOptions: {
         level: 2 // 压缩等级1~9 1压缩速度最快，9最优压缩方式
       }
     }).then((res)=>{
        self.postMessage({name:"succee",data:res})
        self.close()
     })
  }catch(err){
    self.postMessage({name:"error",data:err})
    self.close()
  }
}