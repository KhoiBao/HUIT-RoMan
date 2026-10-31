enum RoomStatus {
  available,
  inUse,
  maintenance;

  static RoomStatus fromApi(String? raw) {
    final v = (raw ?? '').trim().toLowerCase();
    if (v.contains('bảo trì') || v == 'maintenance') return RoomStatus.maintenance;
    if (v.contains('đang') || v == 'inuse' || v == 'in use') return RoomStatus.inUse;
    return RoomStatus.available;
  }

  String get label => switch (this) {
        RoomStatus.available => 'Trống',
        RoomStatus.inUse => 'Đang sử dụng',
        RoomStatus.maintenance => 'Bảo trì',
      };
}

class Room {
  const Room({
    required this.id,
    required this.name,
    required this.roomCode,
    required this.building,
    required this.floor,
    required this.capacity,
    required this.roomTypeId,
    required this.roomTypeName,
    required this.isBookingByPeriod,
    required this.status,
    this.roomNumber = '',
    this.description = '',
    this.departmentName,
  });

  final int id;
  final String name;
  final String roomCode;
  final String building;
  final String floor;
  final String roomNumber;
  final int capacity;
  final int roomTypeId;
  final String roomTypeName;
  final bool isBookingByPeriod;
  final RoomStatus status;
  final String description;
  final String? departmentName;

  String get location {
    final parts = <String>[
      if (building.isNotEmpty) building,
      if (floor.isNotEmpty) 'Tầng $floor',
    ];
    return parts.join(' · ');
  }

  String get bookingMode => isBookingByPeriod ? 'Theo tiết' : 'Theo khung giờ';

  factory Room.fromJson(Map<String, dynamic> json) => Room(
        id: (json['id'] ?? 0) as int,
        name: (json['name'] ?? json['roomName'] ?? '').toString(),
        roomCode: (json['roomCode'] ?? json['code'] ?? '').toString(),
        building: (json['building'] ?? '').toString(),
        floor: (json['floor'] ?? '').toString(),
        roomNumber: (json['roomNumber'] ?? '').toString(),
        capacity: (json['capacity'] ?? 0) as int,
        roomTypeId: (json['roomTypeId'] ?? 0) as int,
        roomTypeName: (json['roomTypeName'] ?? '').toString(),
        isBookingByPeriod: json['isBookingByPeriod'] == true,
        status: RoomStatus.fromApi(json['status']?.toString()),
        description: (json['description'] ?? '').toString(),
        departmentName: json['departmentName'] as String?,
      );
}

class RoomEquipment {
  const RoomEquipment({
    required this.id,
    required this.name,
    required this.quantity,
    this.status = '',
  });

  final int id;
  final String name;
  final int quantity;
  final String status;

  factory RoomEquipment.fromJson(Map<String, dynamic> json) => RoomEquipment(
        id: (json['equipmentId'] ?? json['id'] ?? 0) as int,
        name: (json['equipmentName'] ?? json['name'] ?? '').toString(),
        quantity: (json['quantity'] ?? 0) as int,
        status: (json['status'] ?? '').toString(),
      );
}

class RoomType {
  const RoomType({
    required this.id,
    required this.name,
    required this.defaultCapacity,
    required this.isBookingByPeriod,
    this.description = '',
  });

  final int id;
  final String name;
  final int defaultCapacity;
  final bool isBookingByPeriod;
  final String description;

  factory RoomType.fromJson(Map<String, dynamic> json) => RoomType(
        id: (json['id'] ?? 0) as int,
        name: (json['name'] ?? '').toString(),
        defaultCapacity: (json['defaultCapacity'] ?? 0) as int,
        isBookingByPeriod: json['isBookingByPeriod'] == true,
        description: (json['description'] ?? '').toString(),
      );
}
