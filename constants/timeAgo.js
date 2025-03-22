import moment from 'moment';

export const timeAgo = (timestamp) => {
  
   
    
    const date = timestamp && timestamp.toDate ? moment(timestamp.toDate()) : timestamp?._seconds ? moment(new Date(timestamp._seconds * 1000)): moment();
    const currentDate = moment();

    const diffInMinutes = currentDate.diff(date, 'minutes');
    const diffInHours = currentDate.diff(date, 'hours');
    const diffInDays = currentDate.diff(date, 'days');
    const diffInWeeks = currentDate.diff(date, 'weeks');
    const diffInMonths = currentDate.diff(date, 'months');

    if (diffInMinutes < 60) {
        return `${diffInMinutes}mins`;
    } else if (diffInHours < 24) {
        return `${diffInHours}h`;
    } else if (diffInDays < 7) {
        return `${diffInDays}d`;
    } else if (diffInWeeks < 4) {
        return `${diffInWeeks}w`;
    } else {
        return `${diffInMonths}m`;
    }
};
