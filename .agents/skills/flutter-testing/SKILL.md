---
name: flutter-testing
description: Flutter testing patterns including widget tests, unit tests, integration tests, golden tests, mocking, and TDD methodology for Flutter/Dart applications.
origin: ai-platform
---

# Flutter Testing Patterns

Comprehensive Flutter testing strategies for widget, unit, and integration tests.

## When to Activate

- Writing new Flutter/Dart code (follow TDD: red, green, refactor)
- Writing widget tests for Flutter components
- Setting up testing infrastructure for Flutter projects
- Testing state management logic (BLoC, Riverpod, Provider, etc.)

## TDD Workflow

### Red-Green-Refactor

```dart
// Step 1: RED - Write failing test
testWidgets('should display user name', (tester) async {
  await tester.pumpWidget(const MyApp());

  expect(find.text('Hello, Alice'), findsOneWidget);
});

// Step 2: GREEN - Implement
// Step 3: REFACTOR - Improve while keeping tests green
```

## Unit Tests

### Basic Unit Test

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/domain/calculator.dart';

void main() {
  group('Calculator', () {
    late Calculator calculator;

    setUp(() {
      calculator = Calculator();
    });

    test('should add two numbers', () {
      expect(calculator.add(2, 3), equals(5));
    });

    test('should subtract two numbers', () {
      expect(calculator.subtract(5, 3), equals(2));
    });

    test('should throw on divide by zero', () {
      expect(() => calculator.divide(10, 0), throwsArgumentError);
    });
  });
}
```

### Table-Driven Tests

```dart
final testCases = [
  ('hello', 'HELLO'),
  ('world', 'WORLD'),
  ('flutter', 'FLUTTER'),
];

for (final (input, expected) in testCases) {
  test('upperCase($input) should return $expected', () {
    expect(input.toUpperCase(), equals(expected));
  });
}
```

## Widget Tests

### Basic Widget Test

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/widgets/counter.dart';

void main() {
  testWidgets('Counter increments smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: CounterWidget()));

    expect(find.text('0'), findsOneWidget);
    expect(find.text('1'), findsNothing);

    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    expect(find.text('0'), findsNothing);
    expect(find.text('1'), findsOneWidget);
  });
}
```

### Testing Widgets with Dependencies

```dart
testWidgets('should show user profile', (tester) async {
  final mockRepo = MockUserRepository();
  when(mockRepo.getUser('123')).thenAnswer((_) async => User(name: 'Alice'));

  await tester.pumpWidget(
    MaterialApp(
      home: UserProfileScreen(userRepository: mockRepo, userId: '123'),
    ),
  );

  await tester.pumpAndSettle();

  expect(find.text('Alice'), findsOneWidget);
  verify(mockRepo.getUser('123')).called(1);
});
```

### Testing State Management (Riverpod)

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('counter should increment with Riverpod', (tester) async {
    final container = ProviderContainer();

    addTearDown(container.dispose);

    expect(container.read(counterProvider), equals(0));

    container.read(counterProvider.notifier).increment();

    expect(container.read(counterProvider), equals(1));
  });
}
```

### Testing State Management (BLoC)

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';

void main() {
  group('CounterCubit', () {
    late CounterCubit cubit;

    setUp(() {
      cubit = CounterCubit();
    });

    tearDown(() {
      cubit.close();
    });

    test('initial state is 0', () {
      expect(cubit.state, equals(0));
    });

    blocTest<CounterCubit, int>(
      'emits [1] when increment is called',
      build: () => cubit,
      act: (cubit) => cubit.increment(),
      expect: () => [1],
    );

    blocTest<CounterCubit, int>(
      'emits [-1] when decrement is called',
      build: () => cubit,
      act: (cubit) => cubit.decrement(),
      expect: () => [-1],
    );
  });
}
```

## Golden Tests

```dart
testWidgets('golden test - login screen', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: LoginScreen()));

  await expectLater(
    find.byType(LoginScreen),
    matchesGoldenFile('goldens/login_screen.png'),
  );
});
```

## Mocking

### Mock Dependencies

```dart
import 'package:mocktail/mocktail.dart';

class MockUserRepository extends Mock implements UserRepository {}

void main() {
  late MockUserRepository mockRepo;

  setUp(() {
    mockRepo = MockUserRepository();
  });

  test('should load user from repository', () async {
    when(() => mockRepo.getUser('123')).thenAnswer(
      (_) async => User(id: '123', name: 'Alice'),
    );

    final service = UserService(mockRepo);
    final user = await service.loadUser('123');

    expect(user.name, equals('Alice'));
    verify(() => mockRepo.getUser('123')).called(1);
  });
}
```

## Integration Tests

```dart
import 'package:integration_test/integration_test.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('complete login flow', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    await tester.enterText(find.byKey(const Key('email')), 'test@example.com');
    await tester.enterText(find.byKey(const Key('password')), 'password123');
    await tester.tap(find.byKey(const Key('login_button')));
    await tester.pumpAndSettle();

    expect(find.text('Welcome'), findsOneWidget);
  });
}
```

## Test Organization

```
test/
├── unit/
│   ├── models/
│   ├── services/
│   └── utils/
├── widget/
│   ├── screens/
│   └── widgets/
├── integration/
│   └── flows/
├── goldens/
├── helpers/
│   ├── mocks.dart
│   ├── fixtures.dart
│   └── test_wrapper.dart
└── mocks/
```

## Best Practices

- Use `pumpAndSettle` for async operations, not `pump`
- Create `testWrapper` helper for widgets needing providers/theme
- Use `setUp`/`tearDown` for test isolation
- Mock all external dependencies (API, database, storage)
- Use `golden` tests for design-critical components
- Test all state transitions: loading, success, error, empty
- Use `group` to organize related tests
- Prefer `expectLater` with `pumpAndSettle` for async assertions

## Quick Reference

| Pattern | Usage |
|---------|-------|
| `testWidgets()` | Widget tests |
| `pumpWidget()` | Build widget for testing |
| `pumpAndSettle()` | Wait for all animations/async |
| `find.text()` | Find widget by text |
| `find.byType()` | Find widget by type |
| `find.byKey()` | Find widget by key |
| `matchesGoldenFile()` | Golden file comparison |
| `Mocktail` | Mocking framework |
| `bloc_test` | BLoC testing utilities |
