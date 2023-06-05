/**
 * Created by maryobikwelu on 2/28/20
 */

const config = {
  port: process.env.PORT || 3000,
  mongo: {
    connectionString: process.env.MONGO_CONNECTION_STRING,
    host: process.env.MONGO_HOST,
    port: process.env.MONGO_PORT,
    user: process.env.MONGO_USER,
    password: process.env.MONGO_PASSWORD,
    database: process.env.MONGO_DATABASE,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      poolSize: 10,
      keepAlive: 1000,
      connectTimeoutMS: 30000,
    },
  },
  redis: {
    connectionString: process.env.REDIS_URL
  },
  key: {
    private: process.env.TOKEN_PRIVATE_KEY,
    public: process.env.TOKEN_PUBLIC_KEY,
  },
  secret: process.env.BTW_TOKEN_SECRET,
  mailgun: {
    mailgunApiKey: process.env.MAILGUN_API_KEY,
    mailgunDomain: process.env.MAILGUN_DOMAIN,
    mailgunSenderName: process.env.MAILGUN_SENDER_NAME,
  },
  aws: {
    AWS_KEY: process.env.AWS_KEY,
    AWS_SECRET: process.env.AWS_SECRET,
    AWS_BUCKET: process.env.AWS_BUCKET,
  },
  cronTime: process.env.CRON_TIME,
  maxToken: process.env.MAX_TOKEN,
  totalWords: process.env.TOTAL_WORDS,
  postKeywords: process.env.POST_KEYWORDS,
  shutterStock_api_key: process.env.SHUTTERSTOCK_API_TOKEN,
  unsplash:{
    access_key: process.env.UNSPLASH_ACCESS_KEY,
    secret_key: process.env.UMSPLASH_SECRET_KEYS
  },
  accountTier:{
    basic_unregistered: process.env.ACCOUNT_TIER_BASIC_UNREGISTERED,
    basic_registered: process.env.ACCOUNT_TIER_BASIC_REGISTERED,
    team: process.env.ACCOUNT_TIER_TEAM,
    enterprise: process.env.ACCOUNT_TIER_ENTERPRISE
  },
  openAi: {
    API_KEY: process.env.OPENAI_API_KEY
  },
  messageQueue: {
    recommendation_queue_url: process.env.RECOMMENDATION_QUEUE_BASE_URL
  }
};

/**
 *  Set the current environment or default to 'development'
 */
process.env.NODE_ENV = process.env.NODE_ENV || "development";
config.env = process.env.NODE_ENV;

module.exports = config;
