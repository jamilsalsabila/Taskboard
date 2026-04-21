export class AuthService {
  constructor(userRepository, authTokenService) {
    this.userRepository = userRepository;
    this.authTokenService = authTokenService;
  }

  async loginGuest(name) {
    const cleanName = name.trim().slice(0, 60);
    if (!cleanName) {
      throw new Error('AUTH_NAME_REQUIRED');
    }

    const user = await this.userRepository.findOrCreateByName(cleanName);
    const token = this.authTokenService.issueToken(user);

    return {
      token,
      user
    };
  }
}
