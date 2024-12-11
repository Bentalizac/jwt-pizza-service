require('express');
const config = require('./config.js');
const os = require('os');

class Metrics {

  constructor() {
    // This will periodically sent metrics to Grafana
    this.metricsBuffer = ""
    this.requestTracker = this.requestTracker.bind(this);
    this.addToBuffer = this.addToBuffer.bind(this);
    this.counts = {}
    this.counts["POST"] = 0
    this.counts["PUT"] = 0
    this.counts["DELETE"] = 0
    this.counts["GET"] = 0
    this.counts["ActiveUsers"] = 0
    this.counts["FailedAuth"] = 0
    this.counts["SuccessfullAuth"] = 0
    const timer = setInterval(() => {
      try {
        this.getSystemMetrics()
        this.buildRequestMetrics()
        this.getAuthMetrics()
        console.log(this.metricsBuffer)
        this.sendMetric(this.metricsBuffer)
        this.clearBuffer()
    } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, 5000);
    timer.unref();
    console.log(timer.hasRef)
  }



  requestTracker(req, res, next) {
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const { method, originalUrl } = req
        const statusCode = req.res.statusCode
        this.counts[method] += 1
        this.addToBuffer(this.buildHttpMetric(method, originalUrl, statusCode, duration))
    })
    next()
  }

  getCostOfOrder(orderedItems) {
    let price = 0
    for(const item of orderedItems) {
      price += item.price
    }
    return price
  }

  authMetrics(req, res, next) {

    res.on('finish', () => {

      const { method } = req
      const statusCode = req.res.statusCode
      if(Math.floor(statusCode / 100) == 2) {
        if(method == "PUT" || method == "POST") {
          this.counts["ActiveUsers"] += 1
          this.counts["SuccessfullAuth"] += 1
        }
        if(method == "DELETE") {
          this.counts["ActiveUsers"] -= 1
          if(this.counts["ActiveUsers"] < 0) {
            this.counts["ActiveUsers"] = 0
          }
        }
      }
      else {
        this.counts["FailedAuth"] += 1
      }
    })
    next();
  }

  orderMetrics(req, res, next) {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { method, originalUrl } = req;

      if (method === 'POST') {
        const orderedItems = req.body.items
        const quantity = orderedItems.length
        const totalCost = this.getCostOfOrder(orderedItems)
        const factorySuccess = res.statusCode !== 500

        if (duration !== undefined) {
          this.addToBuffer(
            `purchase,source=${config.metrics.source},path=${originalUrl},factory_success=${factorySuccess} response_time=${duration},quantity=${quantity},total_cost=${totalCost}`
          );
        }
      }
    });
    next();
  }

  addToBuffer(metric) {
    this.metricsBuffer += metric+"\n"
  }
  clearBuffer() {
    this.metricsBuffer = ""
    this.counts["POST"] = 0
    this.counts["PUT"] = 0
    this.counts["DELETE"] = 0
    this.counts["GET"] = 0
    this.counts["FailedAuth"] = 0
    this.counts["SuccessfullAuth"] = 0
  }

  buildOrderMetric() {
    return `order,source=${config.metrics.source},`
  }

  buildHttpMetric(method, path, status, duration) {
    return `request,source=${config.metrics.source},method=${method},status=${status},path=${path} duration=${duration},count=1`;
  }

  buildSingleValueMetric(metricPrefix, metricName, metricValue) {
    return `${metricPrefix},source=${config.metrics.source} ${metricName}=${metricValue}`;
  }

  getAuthMetrics() {
    const successfulAuths = `successful_authentications,source=${config.metrics.source} count=${this.counts["SuccessfullAuth"]}`
    const failedAuths = `failed_authentications,source=${config.metrics.source} count=${this.counts["FailedAuth"]}`
    const activeUsers = `active_users,source=${config.metrics.source} count=${this.counts["ActiveUsers"]}`
    this.addToBuffer(successfulAuths)
    this.addToBuffer(failedAuths)
    this.addToBuffer(activeUsers)
  }

  getSystemMetrics(){
    let memoryUsage = this.buildSingleValueMetric("system", "memory_usage", this.getMemoryUsagePercentage())
    let cpuUsage = this.buildSingleValueMetric("system", "cpu_usage", this.getCpuUsagePercentage())
    this.addToBuffer(memoryUsage)
    this.addToBuffer(cpuUsage)
  }

  buildRequestMetrics() {
    this.addToBuffer(`requestMetrics,source=${config.metrics.source} putRequests=${this.counts["PUT"]},getRequests=${this.counts["GET"]},deleteRequests=${this.counts["DELETE"]},postRequests=${this.counts["POST"]}`)
  }

  sendMetric(metric) {
    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metric,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error('Failed to push metrics data to Grafana');
        } else {
          console.log(`Pushed ${metric}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }
}

const metrics = new Metrics();
module.exports = metrics;