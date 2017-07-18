var path = require('path');

module.exports = {
  entry: {
    app: path.resolve(__dirname, 'src/main.jsx')
  },
  node: {
    fs: 'empty'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  module: {
    loaders: [
      { test: /\.md$/, loader: 'babel-loader?{"presets":["es2015","react"]}!react-markdown-loader' },
      { test: /\.jsx?$/, exclude: /node_modules/, loader: "babel-loader", query: { presets: ['es2015', 'react'] } }
    ]
  },
  resolve: {
    extensions: ['.js', '.json', '.jsx']
  }
};
