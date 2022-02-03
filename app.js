/*
Notlar
datalarin getirildigi istek : https://www.millipiyangoonline.com/sisalsans/result.all.1.2022.json?cache=false
sayisal loto detayların getirildiği ornek bir istek : https://www.millipiyangoonline.com/sisalsans/drawdetails.sayisaloto.13.2022.json burda 13 kazanan numara. 2022 de o gunun yili
super loto detaylarin getirildigi ornek bir istek : https://www.millipiyangoonline.com/sisalsans/drawdetails.superloto.11.2022.json burda 11 kazanan numara. 2022 de o gunun yili       
sans topu detaylarin getirildigi ornek bir istek : https://www.millipiyangoonline.com/sisalsans/drawdetails.sanstopu.8.2022.json burda 8 kazanan numara. 2022 de o gunun yili                      
10 numara detaylarin getirildigi ornek bir istek :https://www.millipiyangoonline.com/sisalsans/drawdetails.onnumara.8.2022.json burda 8 kazanan numara. 2022 de o gunun yili.
*/

const axios = require('axios')
const fs = require('fs');
const { initializeApp } = require("firebase/app");
const { getFirestore,addDoc,collection,getDocs } = require("firebase/firestore") 
const firebaseConfig = {
    apiKey: "***",
    authDomain: "***",
    projectId: "***",
    storageBucket: "***",
    messagingSenderId: "***",
    appId: "***",
    measurementId: "***"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getData(date){
    const onnumara = []
    const sanstopu = []
    const sayisal = []
    const superloto = []
    createFiles()
    const splitedDate = date.split('.')
    let today = null
    if(splitedDate.length == 3){
        date = splitedDate[1] + '.' + splitedDate[2]
        today = (splitedDate[1].length == 1?'0'+splitedDate[1]:splitedDate[1]) + '/' + (splitedDate[0].length == 1?'0'+splitedDate[0]:splitedDate[0]) + '/' +splitedDate[2]
    }
    const rootUrl = `https://www.millipiyangoonline.com/sisalsans/result.all.${date}.json`
    const allDataresponse = await axios.get(rootUrl)
    let allData = today?allDataresponse.data.filter(d => d.drawDate == today):allDataresponse.data
    allData = allData.filter(data => data.status != "1")
    for(const data of allData){
        let result = null;
        switch(data.lotteryName){
            case "SAYISAL":
                const sayisalDetailUrl = `https://www.millipiyangoonline.com/sisalsans/drawdetails.sayisaloto.${data.drawnNr}.2022.json`
                result = (await axios.get(sayisalDetailUrl)).data
                sayisal.push(result)
                break;
            case "SANSTOPU":
                const sanstopuDetailUrl = `https://www.millipiyangoonline.com/sisalsans/drawdetails.sanstopu.${data.drawnNr}.2022.json`
                result = (await axios.get(sanstopuDetailUrl)).data
                sanstopu.push(result)
                break;
            case "SUPERLOTO":
                const superlotoDetailUrl = `https://www.millipiyangoonline.com/sisalsans/drawdetails.superloto.${data.drawnNr}.2022.json`
                result = (await axios.get(superlotoDetailUrl)).data
                superloto.push(result)
                break;
            case "ONNUMARA":
                const onnumaraDetailUrl = `https://www.millipiyangoonline.com/sisalsans/drawdetails.onnumara.${data.drawnNr}.2022.json`
                result = (await axios.get(onnumaraDetailUrl)).data
                onnumara.push(result)
                break;
        }
    }
    const sayisalResult = formatData(sayisal)
    const sanstopuResult = formatData(sanstopu)
    const superlotoResult = formatData(superloto)
    const onnumaraResult = formatData(onnumara)
    writeToFile("SAYISAL",sayisalResult)
    writeToFile("SANSTOPU",sanstopuResult)
    writeToFile("SUPERLOTO",superlotoResult)
    writeToFile("ONNUMARA",onnumaraResult)
    await addToDatabase("OnResults",onnumaraResult)
    await addToDatabase("SansResults",sanstopuResult)
    await addToDatabase("SayResults",sayisalResult)
    await addToDatabase("SupResults",superlotoResult)
    process.exit()
}

function formatData(detailDataArr){
    const allResult = []
    for(const detail of detailDataArr){
        const result = {
        }
        result['date'] = (new Date(detail.dateDetails))
        result['numbers'] = detail.winningNumber.map(number => {
            if(number < 10 && number != 0){
                return '0'+number
            }
            return number + ''
        }).join(', ')
        if(detail.numberJolly.length != 0){
            result['numbers'] = result['numbers'] + ', +' +detail.numberJolly
        }
        for(let i = 0 ; i < detail.tableResult.length;i++){
            let price = detail.tableResult[i].prizeWinner.substr(0,detail.tableResult[i].prizeWinner.length-2)
            if(price == ''){
                price = "0"
            }
            result['result' + (i+1)] = {
                count : detail.tableResult[i].numbersMatched.replace('p','+')+" bilen " + detail.tableResult[i].totalWinners + " kişi",
                price : price
            }
        }
        allResult.push(result)
    }
    return allResult
}

function writeToFile(dataType,data){
    fs.writeFileSync(`${dataType}.json`, JSON.stringify(data));
}

function createFiles(){
    fs.writeFileSync('SAYISAL.json','');
    fs.writeFileSync('SANSTOPU.json','');
    fs.writeFileSync('SUPERLOTO.json','');
    fs.writeFileSync('ONNUMARA.json','');
}

async function addToDatabase(dbPath,data){
    const oldData = await getDatabase(dbPath)
    for(const singleData of data){
        if(!oldData.some(singleOldData =>  (new Date(singleOldData.date.seconds)).getTime().toString() == (new Date(singleData.date)).getTime().toString().slice(0,10) && singleOldData.numbers == singleData.numbers)){
            await addDoc(collection(db, dbPath),singleData)
        }
    }
}

async function getDatabase(dbPath){
    const data = await getDocs(collection(db, dbPath));
    const oldData = []
    data.forEach((doc) => {
        oldData.push(doc.data())
    })
    return oldData
}

getData("1.2022")
