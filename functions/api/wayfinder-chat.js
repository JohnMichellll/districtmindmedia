const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const MUSIC=/\b(music|artist|artists|rapper|rap|hip[ -]?hop|r&b|album|albums|single|song|songs|track|tracks|release|releases|concert|concerts|tour|tours|show|shows|festival|festivals|ticket|tickets|producer|producer|beat|beats|playlist|playlists|lyrics|mixing|mastering|record|records|label|labels|streaming|spotify|apple music|youtube|billboard|chart|charts|genre|band|singer|vocal|vocals|freestyle|discography|new music|friday|independent|indie|dj|djs|venue|venues|gig|gigs|music video|music videos)\b/i;
const system = "You are WAYFINDER, the music-only discovery assistant for District Mind Media. You help with artists, hip-hop, R&B, genres, albums, singles, tracks, releases, music news, playlists, music production, beats, vocals, independent labels, music videos, concerts, festivals, venues and tickets. You must ONLY answer music-related questions. If a request is unrelated to music, politely say Wayfinder is dedicated to music discovery and invite the person to ask about an artist, song, release, music news or live show. Never give general life advice, general coding help, medical/legal/financial advice, or unrelated news. Be clear when you do not have live verified data. Do not invent concert dates, ticket links, streaming links, release dates, chart positions, biographies or facts. When asked for local concerts, direct the user to the Concerts Near You page and ask for city/state if needed; do not imply you know their exact location unless they share it in the chat. Keep answers friendly, useful and concise. Suggest a next music-related step. You cannot claim to change the site or access private accounts. Do not request sensitive information.";
export async function onRequestPost({request,env}) {
 const url=new URL(request.url); const origin=request.headers.get("Origin");
 if(origin){try{if(new URL(origin).host!==url.host)return json({error:"Origin not allowed."},403)}catch{return json({error:"Invalid origin."},403)}}
 let body; try{body=await request.json()}catch{return json({error:"Send a music question as JSON."},400)}
 const messages=Array.isArray(body.messages)?body.messages.slice(-8):[];
 const safe=[];
 for(const m of messages){if(!m||!["user","assistant"].includes(m.role)||typeof m.content!=="string")continue;const content=m.content.trim().slice(0,1200);if(content)safe.push({role:m.role,content});}
 if(!safe.length||safe[safe.length-1].role!=="user")return json({error:"Ask Wayfinder a music question."},400);
 const question=safe[safe.length-1].content;
 const clearlyOffTopic=/\b(weather|forecast|recipe|cooking|homework|taxes|politics|president|medical|symptom|diagnosis|investment|stocks|mortgage|car repair|programming|javascript|python code|password reset|relationship advice)\b/i.test(question);
 const shortDiscoveryQuery=question.trim().split(/\\s+/).length<=5 && !clearlyOffTopic;
 if(!MUSIC.test(question)&&!shortDiscoveryQuery)return json({reply:"I’m Wayfinder — built for music only. 🎧 Ask me about an artist, a song, new releases, music news, production, playlists, or concerts and festivals."});
 if(!env.XAI_API_KEY)return json({reply:"Wayfinder’s chat brain isn’t connected yet, but the music desk is still open. Use the quick routes below to search artists, explore new releases, read music news, or find concerts. To turn on AI replies, add the XAI_API_KEY secret in Cloudflare Pages.",mode:"fallback"});
 try{
  const r=await fetch("https://api.x.ai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+env.XAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"grok-4",messages:[{role:"system",content:system},...safe],max_tokens:650,temperature:0.35})});
  if(!r.ok)return json({error:"Wayfinder’s AI service is temporarily unavailable. Try a music search below."},502);
  const data=await r.json(); const reply=data?.choices?.[0]?.message?.content;
  if(typeof reply!=="string"||!reply.trim())return json({error:"Wayfinder didn’t get a usable answer. Try one of the music routes below."},502);
  return json({reply:reply.trim()});
 }catch{return json({error:"Wayfinder’s AI service is temporarily unavailable. Try a music search below."},502)}
}