<?php

class ApiController extends BaseController {

	protected $statusCode = 200;

	public function getStatusCode()
	{
		return $this->statusCode;
	}

	public function setStatusCode($statusCode)
	{
		$this->statusCode = $statusCode;

		return $this;
	}

	public function respondNotFound($message = 'Not found!')
	{
		return $this->setStatusCode(404)->respondWithError($message);
	}

	public function respondBadRequest($message = 'Bad Request!', $validation)
	{
		return $this->setStatusCode(400)->respondWithErrorAndValidation($message, $validation);
	}

	public function respondCreated($message)
	{
		return $this->setStatusCode(201)->respond([
			'message' => $message
		]);
	}

	public function respond($data, $headers = [])
	{
		return Response::json($data, $this->getStatusCode(), $headers);
	}

	public function respondWithError($message)
	{
		return $this->respond([
			'error' => [
				'message' => $message,
				'status_code' => $this->getStatusCode()
			]
		]);
	}

	public function respondWithErrorAndValidation($message, $validation)
	{
		return $this->respond([
			'error' => [
				'message' => $message,
				'status_code' => $this->getStatusCode(),
				'validation_errors' => $validation
			]
		]);
	}

}
