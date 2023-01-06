import os from 'os'

// 获取ip地址
function getIPAdress() {
    console.log(os)
    // var interfaces = os.networkInterfaces();
    // for (var devName in interfaces) {
    //     var iface = interfaces[devName];
    //     for (var i = 0; i < iface.length; i++) {
    //         var alias = iface[i];
    //         if (alias.family === 'IPv4' && !alias.internal) {
    //             return alias.address;
    //         }
    //     }
    // }
  }

 export default getIPAdress