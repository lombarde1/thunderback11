import jwt from 'jsonwebtoken';
import User from './models/user.model.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NDRjMzJhYjcyYTQ5NjZkMzdlY2NkMiIsImlhdCI6MTc0OTMzNjg3NCwiZXhwIjoxNzUxOTI4ODc0fQ.SBSJLH3sqNHssDAvNwvxTcd6vGEXCV4xU_jd3O-Rv6Y';

async function testUserPermissions() {
  console.log('🧪 TESTANDO PERMISSÕES DO USUÁRIO');
  console.log('=' .repeat(50));

  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Decodificar token
    console.log('🔄 Decodificando token...');
    const decoded = jwt.verify(TEST_TOKEN, process.env.JWT_SECRET);
    console.log('📄 Token decodificado:', decoded);
    console.log('');

    // Buscar usuário
    console.log('🔄 Buscando usuário no banco...');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      console.log('❌ Usuário não encontrado!');
      return { success: false, error: 'Usuário não encontrado' };
    }

    console.log('✅ Usuário encontrado!');
    console.log('📄 Dados do usuário:');
    console.log({
      id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    });
    console.log('');

    // Verificar permissões
    console.log('🔄 Verificando permissões...');
    
    if (user.role !== 'ADMIN') {
      console.log('❌ Usuário NÃO é admin!');
      console.log('🔧 Para tornar admin, execute:');
      console.log(`   db.users.updateOne({_id: ObjectId("${user._id}")}, {$set: {role: "ADMIN"}})`);
      
      // Atualizar para admin automaticamente
      console.log('🔄 Atualizando usuário para ADMIN...');
      user.role = 'ADMIN';
      await user.save();
      console.log('✅ Usuário atualizado para ADMIN!');
    } else {
      console.log('✅ Usuário é ADMIN!');
    }

    if (user.status !== 'ACTIVE') {
      console.log('❌ Usuário NÃO está ativo!');
      console.log('🔄 Ativando usuário...');
      user.status = 'ACTIVE';
      await user.save();
      console.log('✅ Usuário ativado!');
    } else {
      console.log('✅ Usuário está ATIVO!');
    }

    console.log('');
    console.log('🎉 VERIFICAÇÃO CONCLUÍDA!');
    console.log('=' .repeat(50));

    return {
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        status: user.status
      }
    };

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.log('=' .repeat(50));
    return { success: false, error: error.message };
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar teste
testUserPermissions()
  .then(result => {
    if (result.success) {
      console.log('✅ Verificação de permissões concluída!');
      process.exit(0);
    } else {
      console.log('❌ Falha na verificação de permissões');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  }); 