import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/core/utils/validators.dart';

void main() {
  test('rejects empty and malformed identifiers', () {
    expect(Validators.loginIdentifier(''), isNotNull);
    expect(Validators.loginIdentifier('ab'), isNotNull);
    expect(Validators.loginIdentifier('bad email@huit.edu.vn'), isNotNull);
  });

  test('accepts email, student code and staff code', () {
    expect(Validators.loginIdentifier('sv@huit.edu.vn'), isNull);
    expect(Validators.loginIdentifier('2123110001'), isNull);
    expect(Validators.loginIdentifier('CBVC-12'), isNull);
  });
}
