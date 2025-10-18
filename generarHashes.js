const bcrypt = require('bcryptjs');

async function generarHashes() {
  const passwords = {
    Ka: '123456',
    Kiri: '123456'
  };

  for (const user in passwords) {
    const hash = await bcrypt.hash(passwords[user], 10);
    console.log(`${user}: ${hash}`);
  }
}

generarHashes();
