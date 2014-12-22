<?php

class TournamentsController extends ApiController {


	/**
	 * Display a listing of tournaments
	 *
	 * @return Response
	 */
	public function index()
	{
		$tournaments = Tournament::all();

		if (count($tournaments) === 0)
		{
			return $this->respondNotFound('No tournaments exist.');
		}

		return $this->respond([
	        'data' => $this->transformCollection($tournaments)
	    ]);
	}


	/**
	 * Store a newly created tournament in storage.
	 *
	 * @return Response
	 */
	public function store()
	{
		$data = Input::all();

		$validator = Validator::make($data, Tournament::$rules);

		if ($validator->fails())
		{
			return $this->respondBadRequest('Validation fails.', $validator->messages()->toArray());
		}

		$tournament = Tournament::create($data);

		return $this->respondCreated('Tournament successfully created.');
	}

	/**
	 * Display the specified tournament.
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function show($id)
	{
		$tournament = Tournament::find($id);

		if ( ! $tournament)
		{
			return $this->respondNotFound('Tournament does not exist.');
		}

		return $this->respond([
	        'data' => $this->transform($tournament)
	    ]);
	}


	/**
	 * Update the specified tournament in storage.
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function update($id)
	{
		$data = Input::all();

		$validator = Validator::make($data, Tournament::$rules);

		if ($validator->fails())
		{
			return $this->respondBadRequest('Validation fails.', $validator->messages()->toArray());
		}

		$tournament = Tournament::find($id);

		$tournament->update($data);

		return $this->respondCreated('Tournament successfully updated.');
	}

	/**
	 * Remove the specified tournament from storage.
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function destroy($id)
	{
		Tournament::destroy($id);

		return $this->respondCreated('Tournament successfully deleted.');
	}

	private function transform($tournament)
	{
		return [
			'id' 		=> (int) $tournament['id'],
			'name' 		=> $tournament['name'],
			'date' 		=> $tournament['date'],
			'location' 	=> $tournament['location'],
		];
	}

	private function transformCollection($tournaments)
	{
		return array_map([$this, 'transform'], $tournaments->toArray());
	}

}
