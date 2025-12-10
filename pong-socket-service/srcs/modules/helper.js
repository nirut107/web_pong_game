import { CronExpressionParser } from 'cron-parser';

export const getIS8601ODate = (timestamp=null) => {

    if(timestamp === null)
        timestamp = Date.now()

    return new Date(timestamp).toISOString().split('.')[0] + 'Z'
}


export const getNextTimestamp = (cronjobSchedule) => {

    const interval = CronExpressionParser.parse(cronjobSchedule) 
    return interval.next()
}

export const getNextISODate = (cronjobSchedule) => {

    
    const interval = CronExpressionParser.parse(cronjobSchedule) 
    return getIS8601ODate(interval.next())
}


export default getIS8601ODate