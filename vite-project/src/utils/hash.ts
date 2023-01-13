self.importScripts("./js/spark-md5")

self.onmessage = e =>{
    console.log(e,'我在worker里');
    // let sparkMD52 = new self.SparkMD5.ArrayBuffer()
    // let reader = new FileReader()
    // reader.readAsArrayBuffer(file)
    // reader.onload = (event:ProgressEvent) => {
    //   console.log(event.target,'event.target')
    //   let target = event.target as FileReader
    //   let str = target.result
    //   sparkMD52.append(str)
    //   let md = sparkMD52.end() 
    //   self.postMessage({name:"succee",data:{md5:md}})
    // }
    // reader.onerror = (err) => {
    //     self.postMessage({name:"error",data:{err}})
    // }
}