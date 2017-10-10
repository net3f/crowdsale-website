import BigNumber from 'bignumber.js';
import { action, observable } from 'mobx';

import backend from '../../backend';
import blockStore from '../../stores/block.store';
import auctionStore from '../../stores/auction.store';
import { fromWei } from '../../utils';

class ChartStore {
  @observable chart = {};
  @observable loading = true;

  totalAccounted = new BigNumber(0);

  constructor () {
    auctionStore.ready(this.fetch);
    blockStore.on('block', this.fetch);
  }

  fetch = async () => {
    const status = await backend.status();

    await this.update(status);

    if (this.loading) {
      this.setLoading(false);
    }
  }

  formatChartData (data) {
    const { target, raised, time } = data;

    return {
      target: fromWei(target).round().toNumber(),
      raised: fromWei(raised).toNumber(),
      time: time.getTime()
    };
  }

  @action setChart (chart) {
    this.chart = chart;
  }

  @action setLoading (loading) {
    this.loading = loading;
  }

  async update (status) {
    const { totalAccounted } = status;

    // Only update the chart when the price updates
    const nextTotalAccounted = new BigNumber(totalAccounted);
    const update = !nextTotalAccounted.eq(this.totalAccounted);

    this.totalAccounted = new BigNumber(totalAccounted);

    if (update) {
      await this.updateChartData();
    }
  }

  async updateChartData () {
    const { beginTime, now } = auctionStore;
    const raisedRawData = await backend.chartData();

    const raisedData = raisedRawData
      .map((datum) => {
        const { time, totalAccounted } = datum;
        const value = new BigNumber(totalAccounted);

        return { value, time: new Date(time) };
      })
      .sort((rA, rB) => rB.time - rA.time);

    const NUM_TICKS = 200;
    const data = [];

    const beginTarget = auctionStore.getTarget(beginTime);
    const nowTarget = auctionStore.getTarget(now);

    const targetInteval = beginTarget.sub(nowTarget).div(NUM_TICKS);

    for (let i = 0; i <= NUM_TICKS; i++) {
      // The target decreases with time
      const target = beginTarget.sub(targetInteval.mul(i));
      const time = auctionStore.getTimeFromTarget(target);
      const raisedIndex = raisedData.findIndex((d) => d.time <= time);
      const raised = raisedIndex === -1
        ? new BigNumber(0)
        : raisedData[raisedIndex].value;

      data.push({ target, time, raised });
    }

    const dateInterval = (now - beginTime) / NUM_TICKS;

    for (let i = 0; i <= NUM_TICKS; i++) {
      const time = new Date(beginTime.getTime() + dateInterval * i);
      const target = auctionStore.getTarget(time);
      const raisedIndex = raisedData.findIndex((d) => d.time <= time);
      const raised = raisedIndex === -1
        ? new BigNumber(0)
        : raisedData[raisedIndex].value;

      data.push({ target, time, raised });
    }

    data.push({
      time: new Date(now.getTime() + dateInterval),
      raised: raisedData[0].value,
      target: nowTarget
    });

    const formattedData = data
      .sort((ptA, ptB) => ptA.time - ptB.time)
      .map((datum) => this.formatChartData(datum));

    this.setChart({
      data: formattedData
    });
  }
}

export default new ChartStore();