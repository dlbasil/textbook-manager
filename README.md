# מנהל ספרי לימוד — Railway

## פריסה ב-Railway

### דרישות
- חשבון Railway (railway.app)
- Git מותקן במחשב

### שלבים

1. **צור Repository ב-GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/שם-משתמש/textbook-manager
   git push -u origin main
   ```

2. **הגדר ב-Railway**
   - כנס ל-railway.app
   - New Project → Deploy from GitHub repo
   - בחר את ה-repo
   - Railway יזהה את `railway.toml` ויפרוס אוטומטית

3. **הוסף Volume לנתונים** (חשוב!)
   - ב-Railway → Settings → Add Volume
   - Mount path: `/data`
   - זה שומר את ה-SQLite גם אחרי deploy חדש

4. **קבל את הכתובת**
   - Railway יתן כתובת כמו: `https://textbook-manager-xyz.railway.app`

### פקודות מקומיות
```bash
npm install
npm start     # הרץ בפורט 3000
```

### API Routes
- `GET  /api/state/:year`    — טעינת כל הנתונים לשנה
- `POST /api/state/:year`    — שמירת כל הנתונים לשנה
- `GET  /api/years`          — רשימת שנים
- `POST /api/years`          — הגדרת שנה פעילה
- `GET  /api/health`         — בדיקת תקינות

### הגירה מ-Netlify
1. פתח את האתר הישן
2. לך ל-ייבוא קבצים → הורד JSON
3. פתח את האתר החדש ב-Railway
4. לך ל-ייבוא קבצים → ייבא JSON
5. לחץ "שמור בשרת"
