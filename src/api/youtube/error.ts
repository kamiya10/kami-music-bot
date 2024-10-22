export class YouTubeFetchError extends Error {
  url: string;

  constructor(response: Response) {
    super(`Server returned a status of ${response.status}: ${response.statusText}`);
    this.url = response.url;
  };
}
