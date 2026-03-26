const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../../../../apps/tl-simulator/public/assets/角色卡面');
const files = fs.readdirSync(dir);
const charsFilePath = path.join(__dirname, 'characters.ts');
let content = fs.readFileSync(charsFilePath, 'utf8');

const nameMap = {
  "上班族": "office_worker",
  "人工智能": "ai",
  "入院患者": "patient",
  "媒体记者": "journalist",
  "异世界人": "alien",
  "情报贩子": "informer",
  "教祖": "cult_leader",
  "神格": "deity",
  "刑警": "police_officer",
  "刑侦警察": "detective",
  "意外因素": "irregular",
  "偶像": "pop_idol",
  "军人": "soldier",
  "医生": "doctor",
  "大人物": "rich_man",
  "大小姐": "heiress",
  "女学生": "girl_student",
  "妹妹": "sister",
  "学者": "scholar",
  "小女孩": "little_girl",
  "巫女": "shrine_maiden",
  "幻想": "illusion",
  "御神木": "goshinboku",
  "手下": "henchman",
  "护士": "nurse",
  "教师": "teacher",
  "模仿者": "copycat",
  "班长": "class_rep",
  "男学生": "boy_student",
  "转校生": "transfer_student",
  "黑猫": "black_cat",
  "临时工": "temp_worker", 
  "临时工？": "temp_worker_question",
  "从者": "follower",
  "上位存在": "higher_being",
  "仙人": "immortal",
  "UP主": "vlogger"
};

if (!content.includes("id: 'irregular'")) {
  const irregularTemplate = `
  // 40
  irregular: {
    id: 'irregular',
    label: { 'zh-CN': '意外因素', en: 'Irregular' },
    traits: [],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilityIds: [],
    passiveAbilityIds: [],
    scriptCreationRules: [],
    source: {},
  },`;
  content = content.replace(/};\s*$/m, irregularTemplate + '\n};\n');
}

if (!content.includes("id: 'detective'")) {
  const detectiveTemplate = `
  // 41
  detective: {
    id: 'detective',
    label: { 'zh-CN': '刑侦警察', en: 'Detective' },
    traits: ['adult', 'man'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilityIds: [],
    passiveAbilityIds: [],
    scriptCreationRules: [],
    source: {},
  },`;
  content = content.replace(/};\s*$/m, detectiveTemplate + '\n};\n');
}

// Now process all files
for (const file of files) {
  if (!file.endsWith('.png')) continue;
  const match = file.match(/character_card-front_(.*?)_01\.png/);
  if (match) {
    const name = match[1];
    const charId = nameMap[name] || name;
    
    // Match the source object directly
    const regexStr = '(id:\\s*\'\\b' + charId + '\\b\'[\\s\\S]*?source:\\s*\\{)([^}]*)(\\})\\s*,';
    const regex = new RegExp(regexStr);
    if (regex.test(content)) {
      content = content.replace(regex, (m, p1, p2, p3) => {
        const assetPath = '/assets/角色卡面/' + file;
        let newP2 = p2;
        if (!newP2.includes('alternateCardAssets')) {
          if (newP2.trim() === '') {
            newP2 = " alternateCardAssets: { new: '" + assetPath + "' } ";
          } else {
             if (!newP2.trim().endsWith(',')) newP2 += ',';
             newP2 += " alternateCardAssets: { new: '" + assetPath + "' } ";
          }
        } else {
           if (!newP2.includes('new:')) {
               newP2 = newP2.replace(/alternateCardAssets:\s*\{/, "alternateCardAssets: { new: '" + assetPath + "', ");
           }
        }
        return p1 + newP2 + p3 + ",";
      });
    } else {
      console.log('Could not find block for:', charId);
    }
  }
}

fs.writeFileSync(charsFilePath, content);
console.log('Patch complete.');
