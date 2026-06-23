const bcrypt = require('bcryptjs');

describe('User Model', () => {
  let User, Role;

  beforeAll(() => {
    const models = global.testUtils.getModels();
    User = models.User;
    Role = models.Role;
  });

  describe('User Creation', () => {
    test('should create a user with valid data', async () => {
      const userData = {
        username: 'johndoe',
        email: 'john@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        first_name: 'John',
        last_name: 'Doe'
      };

      const user = await User.create(userData);

      expect(user.id).toBeDefined();
      expect(user.username).toBe('johndoe');
      expect(user.email).toBe('john@example.com');
      expect(user.first_name).toBe('John');
      expect(user.last_name).toBe('Doe');
      expect(user.is_active).toBe(true); // valor por defecto
      expect(user.email_verified).toBe(false); // valor por defecto
    });

    test('should fail with duplicate username', async () => {
      const userData = {
        username: 'duplicate',
        email: 'user1@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        first_name: 'User',
        last_name: 'One'
      };

      await User.create(userData);

      const duplicateUser = {
        ...userData,
        email: 'user2@example.com'
      };

      await expect(User.create(duplicateUser))
        .rejects
        .toThrow();
    });

    test('should fail with duplicate email', async () => {
      const userData = {
        username: 'user1',
        email: 'duplicate@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        first_name: 'User',
        last_name: 'One'
      };

      await User.create(userData);

      const duplicateUser = {
        ...userData,
        username: 'user2'
      };

      await expect(User.create(duplicateUser))
        .rejects
        .toThrow();
    });

    test('should fail with invalid email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password_hash: await bcrypt.hash('password123', 10),
        first_name: 'Test',
        last_name: 'User'
      };

      await expect(User.create(userData))
        .rejects
        .toThrow();
    });
  });

  describe('User Validations', () => {
    test('should require username', async () => {
      const userData = {
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        first_name: 'Test',
        last_name: 'User'
      };

      await expect(User.create(userData))
        .rejects
        .toThrow();
    });

    test('should require email', async () => {
      const userData = {
        username: 'testuser',
        password: await bcrypt.hash('password123', 10),
        first_name: 'Test',
        last_name: 'User'
      };

      await expect(User.create(userData))
        .rejects
        .toThrow();
    });

    test('should require password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      };

      await expect(User.create(userData))
        .rejects
        .toThrow();
    });

    test('should validate username length', async () => {
      const userData = {
        username: 'ab', // too short
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        first_name: 'Test',
        last_name: 'User'
      };

      await expect(User.create(userData))
        .rejects
        .toThrow();
    });
  });

  describe('User Methods', () => {
    test('should get full name', async () => {
      const user = await global.testUtils.createTestUser({
        first_name: 'John',
        last_name: 'Doe'
      });

      const fullName = user.getFullName();
      expect(fullName).toBe('John Doe');
    });

    test('should check if user is admin', async () => {
      const user = await global.testUtils.createTestUser();
      
      // creamos el rol de admin
      const adminRole = await Role.create({
        name: 'admin',
        display_name: 'Administrator',
        description: 'Admin role for testing',
        level: 8
      });

      // asociamos el usuario con el rol de admin
      await user.addRole(adminRole);
      
      // recargamos el usuario con sus roles
      const userWithRoles = await User.findByPk(user.id, {
        include: [{ model: Role, as: 'roles' }]
      });
      
      // comprobamos si el usuario tiene el rol admin
      const hasAdminRole = userWithRoles.roles.some(role => role.name === 'admin');
      expect(hasAdminRole).toBe(true);
    });
  });

  describe('User Associations', () => {
    test('should associate with roles', async () => {
      const user = await global.testUtils.createTestUser();
      
      const role = await Role.create({
        name: 'customer',
        display_name: 'Customer',
        description: 'Customer role for testing',
        level: 1,
        permissions: { products: { read: true } }
      });

      await user.addRole(role);
      await user.reload({ include: [{ model: Role, as: 'roles' }] });

      expect(user.roles).toHaveLength(1);
      expect(user.roles[0].name).toBe('customer');
    });
  });
});