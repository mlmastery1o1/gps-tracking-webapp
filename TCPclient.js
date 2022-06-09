var net = require('net'); 

host = '162.241.85.65';
port = 50095;
var client = new net.Socket(); 

client.connect( port, host, () => { 
    console.log(`client connected to ${host}:${port}`); 
    count = 0;
    while (count < 100){
        client.write('count-'+ count+"\n"); 
        if(count === 100){
            count = 0;
        }else{
            count = count+1;
        }
    }
    
    }); 