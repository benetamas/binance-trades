// vim: set sw=4 sts=4 et:
// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

const Clutter = imports.gi.Clutter
const St = imports.gi.St

const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu
const Soup = imports.gi.Soup
const Mainloop = imports.mainloop
const Lang = imports.lang
const GLib = imports.gi.GLib
const GObject = imports.gi.GObject

var BinanceTradesButton = class BinanceTradesButton extends PanelMenu.Button {

  _init() {
    super._init(0.0, "BinanceTrades Button", false)
    this.pairs = ['ETHEUR', 'BTCEUR', 'SOLEUR', 'XMRBUSD']
    this.pairIndex = 0
    this.buttonText = new St.Label({
      text: 'Waiting for data...',
      y_align: Clutter.ActorAlign.CENTER
    })
    this.add_child(this.buttonText)
    this._updateLabel()
    this.session = undefined
  }

  get url1() {
      return `https://api.binance.com/api/v3/trades?symbol=${this.currentPair}&limit=1`
  }

  get url2() {
      return `https://api.binance.com/api/v3/ticker/24hr?symbol=${this.currentPair}`
  }

  get currentPair() {
      return this.pairs[this.pairIndex]
  }

  _updateLabel() {
    const refreshTime = 5 // in seconds

    if (this._timeout) {
      Mainloop.source_remove(this._timeout)
      this._timeout = null
    }
    this._timeout = Mainloop.timeout_add_seconds(refreshTime, Lang.bind(this, this._updateLabel))
    this._get_latest_binance_trades_price()
  }

  _setLabelText(text) {
    this.buttonText.set_text(text)
  }

  _removeTimeout() {
    if (this._timeout) {
      this._timeout = null
    }
  }


  stop() {
    if (this._timeout) {
      Mainloop.source_remove(this._timeout)
    }
    this._removeTimeout()

    this.menu.removeAll()

  }

  _get_latest_binance_trades_price() {
    const self = this
    let price, priceChangePercent, label

    if (this.session === undefined) this.session = new Soup.SessionAsync()

    let request = Soup.Message.new('GET', this.url1)

    this.session.queue_message(request, Lang.bind(this, function (session, response) {
      if (response && response.response_body && response.response_body.data) {
        price = JSON.parse(response.response_body.data)[0].price
        price = this._formatNumber(price)
        label = `${this.currentPair}: ${price.toString()}`
        this.latestPrice = price

        let request2 = Soup.Message.new('GET', this.url2)
        self.session.queue_message(request2, Lang.bind(this, function (session, response2) {
          if (response2) {
            priceChangePercent = JSON.parse(response2.response_body.data).priceChangePercent
            priceChangePercent = self._formatNumber(priceChangePercent)
            label += ` (${priceChangePercent}%)`
            self._setLabelText(label)
            self.pairIndex = (self.pairIndex + 1) % self.pairs.length
          }
        }))
      } else this._setLabelText("Waiting for data...")
    }))

    return true
  }

  _formatNumber(value) {
    return parseFloat(value).toFixed(2)
  }

}

BinanceTradesButton = GObject.registerClass(
    {GTypeName: 'BinanceTradesButton'},
    BinanceTradesButton
);


let binanceTradesButton

function enable() {
  binanceTradesButton = new BinanceTradesButton()
  Main.panel.addToStatusArea('binance-trades', binanceTradesButton, -1, "left")
}

function disable() {
  binanceTradesButton.stop()
  binanceTradesButton.destroy()
}
