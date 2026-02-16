exports.handler = async ()=>({
  statusCode:200,
  headers:{ "Content-Type":"application/json" },
  body: JSON.stringify({
    PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL || "https://radarpromo974.netlify.app/",
    RRD_SERVICES_URL: process.env.RRD_SERVICES_URL || "https://devisexpress974.netlify.app/",
    PAYPAL_BOOST_24H_URL: process.env.PAYPAL_BOOST_24H_URL || "https://www.paypal.com/ncp/payment/PJL5R2DKD7L2Y",
    PAYPAL_BOOST_7D_URL: process.env.PAYPAL_BOOST_7D_URL || "https://www.paypal.com/ncp/payment/UZQZGGDAMC6GJ",
    PAYPAL_BOOST_NOTIFY_URL: process.env.PAYPAL_BOOST_NOTIFY_URL || "https://www.paypal.com/ncp/payment/MXX9GR57UYAKN",
  })
});