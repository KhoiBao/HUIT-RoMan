import '../../../core/network/api_client.dart';
import '../../../core/network/api_envelope.dart';
import '../domain/room.dart';

class RoomsApi {
  RoomsApi(this._client);
  final ApiClient _client;

  Future<List<Room>> list() async => asList(await _client.get('/api/Rooms'))
      .map(Room.fromJson)
      .toList();

  Future<Room> byId(int id) async =>
      Room.fromJson(asMap(await _client.get('/api/Rooms/$id')));

  Future<List<RoomEquipment>> equipments(int roomId) async =>
      asList(await _client.get('/api/Rooms/$roomId/equipments'))
          .map(RoomEquipment.fromJson)
          .toList();

  Future<List<RoomType>> types() async =>
      asList(await _client.get('/api/RoomTypes')).map(RoomType.fromJson).toList();
}
