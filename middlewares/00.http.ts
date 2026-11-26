import "@/utils/environment";
import { serviceHttp } from "@/middlewares/http";

export default serviceHttp({
  maxBodySize: 524288,
  compress: true,
  cors: true,
  insightProxy: true,
});
