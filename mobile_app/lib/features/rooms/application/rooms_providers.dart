import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers.dart';
import '../data/rooms_api.dart';
import '../data/rooms_repository_impl.dart';
import '../domain/room.dart';
import '../domain/room_repository.dart';

final roomsApiProvider =
    Provider((ref) => RoomsApi(ref.watch(apiClientProvider)));

final roomsRepositoryProvider = Provider<RoomRepository>(
    (ref) => RoomsRepositoryImpl(ref.watch(roomsApiProvider)));

final roomsProvider = FutureProvider.autoDispose<List<Room>>(
    (ref) => ref.watch(roomsRepositoryProvider).list());

final roomProvider = FutureProvider.autoDispose.family<Room, int>(
    (ref, id) => ref.watch(roomsRepositoryProvider).byId(id));

final roomEquipmentsProvider =
    FutureProvider.autoDispose.family<List<RoomEquipment>, int>(
        (ref, id) => ref.watch(roomsRepositoryProvider).equipments(id));
