const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk(__dirname);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const isModuleFile = file.includes('\\modules\\') || file.includes('/modules/');
  const isSharedFile = file.includes('\\shared\\') || file.includes('/shared/');
  const isRootFile = file === path.join(__dirname, 'index.ts');

  if (isModuleFile) {
    // inside modules/auth/, moving up to config
    content = content.replace(/from '\.\.\/config/g, "from '../../config");
    // moving up to middleware
    content = content.replace(/from '\.\.\/middleware/g, "from '../../shared/middleware");
    // moving up to utils
    content = content.replace(/from '\.\.\/utils/g, "from '../../shared/utils");
    
    // from '../services/X' or '../routes/X' 
    // Since we grouped them, we just need to see if it's the SAME module.
    // e.g. auth.routes.ts importing auth.service.ts
    // Let's just do a generic replace. If it fails, tsc will catch it.
    content = content.replace(/from '\.\.\/services\/([^']+)'/g, (match, p1) => {
      return `from './${p1}'`;
    });
    content = content.replace(/from '\.\.\/routes\/([^']+)'/g, (match, p1) => {
      return `from './${p1}'`;
    });
  } else if (isSharedFile) {
    content = content.replace(/from '\.\.\/config/g, "from '../../config");
    content = content.replace(/from '\.\.\/utils/g, "from '../utils");
  } else if (isRootFile) {
    content = content.replace(/from '\.\/middleware/g, "from './shared/middleware");
    content = content.replace(/from '\.\/routes\/auth.routes'/g, "from './modules/auth/auth.routes'");
    content = content.replace(/from '\.\/routes\/doctor.routes'/g, "from './modules/users/doctor.routes'");
    content = content.replace(/from '\.\/routes\/appointment.routes'/g, "from './modules/appointments/appointment.routes'");
    content = content.replace(/from '\.\/routes\/patient.routes'/g, "from './modules/users/patient.routes'");
    content = content.replace(/from '\.\/routes\/medical.routes'/g, "from './modules/consultations/medical.routes'");
    content = content.replace(/from '\.\/routes\/file.routes'/g, "from './modules/media/file.routes'");
  }

  if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed imports in', file);
  }
});
