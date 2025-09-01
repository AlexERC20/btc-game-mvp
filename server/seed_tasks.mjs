import pg from 'pg';

const TASKS = [
  {
    id:'d_arena_bids_20', period:'DAILY', title:'Сделай 20 ставок на Арене', desc:null,
    event:'arena_bid', target_count:20, visible_min_level:1,
    reward_json:[{type:'usd_bonus',amount:5000},{type:'limit_usd_delta',amount:500}]
  },
  {
    id:'d_arena_win_1', period:'DAILY', title:'Победи 1 раз на Арене', desc:null,
    event:'arena_win', target_count:1, visible_min_level:1,
    reward_json:[{type:'usd_bonus',amount:3000},{type:'xp_bonus',amount:300}]
  },
  {
    id:'d_classic_any_50', period:'DAILY', title:'Сделай 50 ставок в Классике', desc:null,
    event:'classic_any', target_count:50, visible_min_level:1,
    reward_json:[{type:'usd_bonus',amount:4000}]
  },
  {
    id:'d_classic_buy_25', period:'DAILY', title:'25 ставок BUY', desc:null,
    event:'classic_buy', target_count:25, visible_min_level:1,
    reward_json:[{type:'usd_bonus',amount:2500}]
  },
  {
    id:'d_classic_sell_25', period:'DAILY', title:'25 ставок SELL', desc:null,
    event:'classic_sell', target_count:25, visible_min_level:1,
    reward_json:[{type:'usd_bonus',amount:2500}]
  },
  {
    id:'d_invite_1_active', period:'DAILY', title:'Пригласи 1 друга, который сегодня сделал ставку', desc:null,
    event:'friend_active_today', target_count:1, visible_min_level:1,
    reward_json:[{type:'limit_usd_delta',amount:500},{type:'usd_bonus',amount:2000}]
  },
  {
    id:'w_arena_wins_10', period:'WEEKLY', title:'10 побед на Арене за неделю', desc:null,
    event:'arena_win', target_count:10, visible_min_level:1,
    reward_json:[{type:'usd_bonus',amount:15000},{type:'xp_bonus',amount:1500}]
  },
  {
    id:'w_arena_bids_300', period:'WEEKLY', title:'300 ставок на Арене за неделю', desc:null,
    event:'arena_bid', target_count:300, visible_min_level:1,
    reward_json:[{type:'usd_bonus',amount:10000},{type:'xp_bonus',amount:700}]
  },
  {
    id:'w_classic_any_300', period:'WEEKLY', title:'300 ставок в Классике за неделю', desc:null,
    event:'classic_any', target_count:300, visible_min_level:1,
    reward_json:[{type:'usd_bonus',amount:10000},{type:'xp_bonus',amount:700}]
  },
  {
    id:'w_invite_5_active', period:'WEEKLY', title:'5 активных друзей за неделю', desc:null,
    event:'friend_active_today', target_count:5, visible_min_level:1,
    reward_json:[{type:'usd_bonus',amount:20000},{type:'xp_bonus',amount:1500}]
  }
];

export async function seedTasks(pool){
  for (const t of TASKS){
    await pool.query(
      `INSERT INTO tasks(id,period,title,descr,event,target_count,visible_min_level,reward_json,is_enabled)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,true)
       ON CONFLICT (id) DO NOTHING`,
      [t.id,t.period,t.title,t.desc,t.event,t.target_count,t.visible_min_level,JSON.stringify(t.reward_json)]
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`){
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });
  seedTasks(pool)
    .then(()=>{ console.log('tasks seeded'); pool.end(); })
    .catch(e=>{ console.error('seed error',e); pool.end(); });
}
