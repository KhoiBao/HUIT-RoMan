import '../domain/room.dart';
import '../domain/room_repository.dart';
import 'rooms_api.dart';

class RoomsRepositoryImpl implements RoomRepository {
  RoomsRepositoryImpl(this._api);
  final RoomsApi _api;

  @override
  Future<List<Room>> list() => _api.list();

  @override
  Future<Room> byId(int id) => _api.byId(id);

  @override
  Future<List<RoomEquipment>> equipments(int roomId) => _api.equipments(roomId);

  @override
  Future<List<RoomType>> types() => _api.types();
}
