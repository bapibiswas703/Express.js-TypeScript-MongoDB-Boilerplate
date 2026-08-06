jest.mock('agenda', () => ({
  Agenda: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    define: jest.fn(),
    every: jest.fn(),
    schedule: jest.fn(),
    now: jest.fn(),
  })),
}));

jest.mock('@agendajs/mongo-backend', () => ({
  MongoBackend: jest.fn(),
}));
