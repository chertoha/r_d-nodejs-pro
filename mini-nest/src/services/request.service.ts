import { Injectable } from "../decorators/injectable.js"
import { RequestRepository } from "./request.repository.js"

@Injectable()
export class RequestService {
  constructor(private readonly requestRepository: RequestRepository) {}

  async getRequestId(): Promise<string | undefined> {
    return this.requestRepository.getRequestId()
  }
}
