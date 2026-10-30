import 'room.dart';

abstract class RoomRepository {
  Future<List<Room>> list();
  Future<Room> byId(int id);
  Future<List<RoomEquipment>> equipments(int roomId);
  Future<List<RoomType>> types();
}
