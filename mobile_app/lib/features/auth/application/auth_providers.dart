import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers.dart';
import '../data/auth_api.dart';
import '../data/auth_repository_impl.dart';
import '../domain/auth_repository.dart';

final authApiProvider = Provider((ref) => AuthApi(ref.watch(apiClientProvider)));

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepositoryImpl(
    ref.watch(authApiProvider),
    ref.watch(tokenStoreProvider),
  ),
);
