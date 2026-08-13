export const ORDER_SELECT =
  "*, customer:customers(id,email,full_name,member_tier,phone), items:order_items(*), shipments(*)";

export const ORDER_LIST_SELECT =
  "*, customer:customers(id,email,full_name), items:order_items(id,title,isbn,quantity,unit_price_cents,total_cents)";

export const RETURN_SELECT =
  "*, items:return_items(*), order:orders(id,order_number,status,total_cents), customer:customers(id,email,full_name)";

export const SHIPMENT_SELECT = "*, events:shipment_events(*), order:orders(id,order_number,status)";

export const TICKET_SELECT =
  "*, events:ticket_events(*), customer:customers(id,email,full_name), order:orders(id,order_number,status)";
