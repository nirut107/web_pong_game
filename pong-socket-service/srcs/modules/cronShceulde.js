import cron, { schedule } from 'node-cron';
import rooms from '../pong42ServerSetup.js';




const setupDefaultCronSchedule = (io) => {

    return 
    rooms

    let schedules = [
        {
            name: 'createTournamet' , 
            cronSchedule : '0 0 15 * * *' ,
            callback: () => {

            }
        } , 
        {
            name: 'initFirstRound' ,
            cronSchedule : '0 50 13 * * *' ,
            callback: () => {

            }
        } ,
        {
            name: 'startFirstRound' ,
            cronSchedule : '55 59 13 * * *' ,
            callback: () => {

            }
        } ,
        {
            name: 'initSecondtRound' ,
            cronSchedule : '0 10 14 * * *' ,
            callback: () => {

            }
        } ,
        {
            name: 'startSecondtRound' ,
            cronSchedule : '55 14 14 * * *' ,
            callback: () => {

            }
        } ,
        {
            name: 'initThirdRound' ,
            cronSchedule : '0 20 14 * * *' ,
            callback: () => {

            }
        } ,
        {
            name: 'startThirdRound' ,
            cronSchedule : '55 29 14 * * *' ,
            callback: () => {

            }
        } ,

    ]   

    console.log(" *** start CronScheduler")
    schedules.forEach( sched => {
        console.log(` - adding cronjob ${sched.name}`)
        cron.schedule( sched.cronSchedule , sched.callback  )
    })
}


export { 
   setupDefaultCronSchedule, 
   cron, 
}
