import moment from 'moment';

export class HomePageMatchCountDto {
  count: number;
  year: number;
  month: number;
  //date: Date;
  constructor(count: number) {
    this.count = count;
    const now = moment();
    const lastMonth = now.subtract(1, 'month');
    //this.date = lastMonth.toDate();
    this.year = lastMonth.year();
    this.month = lastMonth.month() + 1;
  }
}
